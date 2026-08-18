from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


class UserProfileManager(BaseUserManager):
    """request-site와 동일한 loginid 기반 계정 모델의 매니저.

    비밀번호 로그인은 쓰지 않는다(사내 ADFS SSO 전용) — create_user 는
    관리자 콘솔·dev 시드 스크립트에서만 쓰인다.
    """

    def create_user(self, loginid, password=None, **extra_fields):
        if not loginid:
            raise ValueError('loginid는 필수입니다.')
        user = self.model(loginid=loginid, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, loginid, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(loginid, password, **extra_fields)


class UserProfile(AbstractBaseUser, PermissionsMixin):
    """사내 ADFS SSO 계정. request-site 의 UserProfile 과 같은 loginid 를 키로 써서,
    같은 ADFS 계정으로 로그인하면 이 서비스에도 동일 인물로 인식된다(로컬 DB 는 별도).
    """

    loginid = models.CharField(max_length=150, unique=True, verbose_name='로그인 ID')
    username = models.CharField(max_length=150, blank=True, verbose_name='이름')
    mail = models.EmailField(blank=True, verbose_name='이메일')
    deptname = models.CharField(max_length=150, blank=True, verbose_name='부서명')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserProfileManager()

    USERNAME_FIELD = 'loginid'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = '사용자'
        verbose_name_plural = '사용자'

    def __str__(self):
        return f"{self.loginid} ({self.username})"


class MailNotification(models.Model):
    """메일 발송 큐 (영속 outbox).

    request-site 의 결재 알림 메일 인프라(큐 적재 → 커밋 직후 즉시 1회 발송 →
    실패 시 APScheduler 1분 주기 재시도)를 이벤트 유형에 구애받지 않는
    범용 형태로 옮겨왔다. 실제 발송 트리거(enqueue 호출부)는 RFG 에 해당
    이벤트가 생기면 추가한다 — 지금은 인프라만 갖춰둔 상태다.
    """

    STATUS_CHOICES = [
        ('pending', '대기'),
        ('sent', '발송 완료'),
        ('failed', '발송 실패'),
    ]

    event_type = models.CharField(max_length=50, verbose_name='이벤트 유형')
    recipients = models.JSONField(default=list, verbose_name='수신자 이메일 목록')
    subject = models.CharField(max_length=500, verbose_name='제목')
    contents = models.TextField(verbose_name='본문(HTML)')
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='pending', verbose_name='상태'
    )
    attempts = models.PositiveSmallIntegerField(default=0, verbose_name='시도 횟수')
    max_attempts = models.PositiveSmallIntegerField(default=5, verbose_name='최대 시도 횟수')
    last_error = models.TextField(blank=True, verbose_name='마지막 오류')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name='발송일시')

    class Meta:
        verbose_name = '알림 메일'
        verbose_name_plural = '알림 메일'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.status}] {self.subject}"
