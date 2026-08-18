"""메일 큐 스케줄러를 단일 프로세스로 상시 실행하는 커맨드.

Usage:
    python manage.py run_scheduler
"""
import signal
import threading

from django.core.management.base import BaseCommand

from api import scheduler


class Command(BaseCommand):
    help = '메일 큐 발송 스케줄러를 단일 프로세스로 상시 실행합니다.'

    def handle(self, *args, **options):
        stop_event = threading.Event()

        def _graceful(signum, frame):
            self.stdout.write(f'종료 신호({signum}) 수신 - 스케줄러 프로세스를 종료합니다.')
            stop_event.set()

        signal.signal(signal.SIGTERM, _graceful)
        signal.signal(signal.SIGINT, _graceful)

        scheduler.start_mail_only()

        # BackgroundScheduler 는 별도 스레드에서 동작하므로,
        # 종료 신호가 올 때까지 메인 스레드를 살려 프로세스를 유지한다.
        stop_event.wait()
