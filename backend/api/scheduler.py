"""메일 큐 발송 스케줄러 (request-site 와 동일 구조: 전용 단일 프로세스에서만 실행).

gunicorn 다중 워커마다 기동하면 같은 job 을 서로 탈취해 중복 발송될 수 있으므로,
`python manage.py run_scheduler` 전용 프로세스(docker-compose 의 `scheduler`
서비스)에서만 시작한다 — `api/apps.py` 는 자동 기동하지 않는다.
"""
import logging

logger = logging.getLogger(__name__)


def start_mail_only():
    """1분 주기로 pending 메일을 재시도 발송하는 잡을 등록한다."""
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    from django_apscheduler.jobstores import DjangoJobStore
    from django.db.utils import ProgrammingError

    scheduler = BackgroundScheduler(timezone='Asia/Seoul')
    scheduler.add_jobstore(DjangoJobStore(), 'default')

    try:
        from .mailer import process_mail_queue
        scheduler.add_job(
            process_mail_queue,
            trigger=IntervalTrigger(minutes=1),
            id='process_mail_queue',
            name='메일 큐 발송',
            replace_existing=True,
            max_instances=1,
        )
        scheduler.start()
        logger.info("[scheduler] 메일 큐 발송 스케줄러 시작 - 1분 주기")
    except ProgrammingError as e:
        logger.warning("[scheduler] 테이블이 아직 생성되지 않았습니다. 마이그레이션 후 재시작됩니다: %s", e)
