"""메일 발송 인프라 (request-site 의 DXHUB 큐 발송 구조를 그대로 옮긴 범용 버전).

설계 개요
---------
1. `enqueue_mail()` 로 `MailNotification` 행을 큐에 적재한다(INSERT 한 번).
2. 커밋 직후 데몬 스레드로 즉시 1회 발송을 시도한다(`transaction.on_commit`).
3. 실패하면 `pending` 으로 남고, APScheduler 잡 `process_mail_queue`(1분 주기,
   `api/scheduler.py`)가 `max_attempts`(기본 5) 회까지 재시도한다. DB 영속이라
   서버 재시작에도 재시도 상태가 보존된다.

RFG 에는 아직 실제로 메일을 보낼 이벤트가 없다 — 이 모듈은 인프라만 갖춰둔
상태이고, 이벤트가 생기면 그 도메인 코드에서 `enqueue_mail(...)` 을 호출하면 된다.
"""
import logging
import threading

import requests
from urllib3.exceptions import InsecureRequestWarning

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from .models import MailNotification

logger = logging.getLogger(__name__)

# 사내 self-signed 인증서 대응으로 verify=False 사용 → 경고 억제
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

DXHUB_TIMEOUT = 10


def enqueue_mail(event_type, recipients, subject, contents):
    """메일 발송을 큐에 적재한다. 수신자가 없으면 아무 것도 하지 않는다."""
    if not recipients:
        logger.info("[mailer] 수신자가 없어 메일 적재를 건너뜁니다 (event=%s)", event_type)
        return None

    noti = MailNotification.objects.create(
        event_type=event_type,
        recipients=list(recipients),
        subject=subject,
        contents=contents,
    )
    noti_id = noti.id
    transaction.on_commit(lambda: _send_now_async(noti_id))
    return noti


def _send_via_dxhub(recipients, subject, contents):
    """DXHUB 메일 API 로 발송한다. 실패 시 예외를 발생시킨다."""
    url = getattr(settings, 'DXHUB_MAIL_URL', '') or ''
    api_key = getattr(settings, 'DXHUB_API_KEY', '') or ''
    if not url or not api_key:
        raise RuntimeError('DXHUB_MAIL_URL/DXHUB_API_KEY 가 설정되지 않았습니다.')

    resp = requests.post(
        f"{url.rstrip('/')}/api/public/gateway/mail/send",
        headers={'X-API-Key': api_key},
        json={'to': recipients, 'subject': subject, 'contents': contents},
        verify=False,
        timeout=DXHUB_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def _process_one(noti_id):
    """단일 알림을 행 락으로 점유한 뒤 발송/재시도 처리한다."""
    with transaction.atomic():
        noti = (
            MailNotification.objects.select_for_update(skip_locked=True)
            .filter(id=noti_id, status='pending')
            .first()
        )
        if noti is None or noti.attempts >= noti.max_attempts:
            return
        try:
            _send_via_dxhub(noti.recipients, noti.subject, noti.contents)
        except Exception as e:  # noqa: BLE001 — 모든 발송 실패를 재시도 대상으로 처리
            noti.attempts += 1
            noti.last_error = str(e)[:2000]
            if noti.attempts >= noti.max_attempts:
                noti.status = 'failed'
                logger.error("[mailer] 메일 발송 최종 실패 (id=%s, attempts=%s): %s", noti.id, noti.attempts, e)
            else:
                logger.warning("[mailer] 메일 발송 실패, 재시도 예정 (id=%s, attempts=%s): %s", noti.id, noti.attempts, e)
            noti.save()
            return
        noti.status = 'sent'
        noti.sent_at = timezone.now()
        noti.last_error = ''
        noti.save()
        logger.info("[mailer] 메일 발송 완료 (id=%s, to=%s)", noti.id, noti.recipients)


def process_mail_queue():
    """pending 상태의 알림을 모두 발송 시도한다 (재시도 max_attempts 회까지)."""
    pending_ids = list(MailNotification.objects.filter(status='pending').values_list('id', flat=True))
    for noti_id in pending_ids:
        try:
            _process_one(noti_id)
        except Exception as e:  # noqa: BLE001 — 한 건 실패가 전체 처리를 막지 않도록
            logger.error("[mailer] 큐 처리 중 예외 (id=%s): %s", noti_id, e)


def _run_immediate(noti_id):
    """별도 스레드에서 단일 알림을 즉시 발송 처리하고 DB 커넥션을 정리한다."""
    try:
        _process_one(noti_id)
    except Exception as e:  # noqa: BLE001 — 즉시 발송 실패는 큐 잡이 재시도한다
        logger.error("[mailer] 즉시 발송 처리 실패 (id=%s): %s", noti_id, e)
    finally:
        connection.close()


def _send_now_async(noti_id):
    """커밋 직후 호출되어 즉시 1회 발송을 데몬 스레드에 위임한다.

    on_commit 콜백에서 실행되므로 절대 예외를 전파하지 않는다.
    """
    try:
        threading.Thread(target=_run_immediate, args=(noti_id,), daemon=True).start()
    except Exception as e:  # noqa: BLE001 — 스레드 생성 실패해도 큐 잡이 재시도한다
        logger.error("[mailer] 즉시 발송 스레드 생성 실패 (id=%s): %s", noti_id, e)
