from django.core.management.base import BaseCommand

from api.mailer import process_mail_queue
from api.models import MailNotification


class Command(BaseCommand):
    help = '메일 큐(pending)를 발송 처리합니다.'

    def handle(self, *args, **options):
        before = MailNotification.objects.filter(status='pending').count()
        self.stdout.write(f'pending 메일 {before}건 발송을 시도합니다...')
        process_mail_queue()
        sent = MailNotification.objects.filter(status='sent').count()
        failed = MailNotification.objects.filter(status='failed').count()
        self.stdout.write(self.style.SUCCESS(f'완료 — sent={sent}, failed={failed}'))
