import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key")

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_apscheduler",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "api.UserProfile"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.CookieJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}

CORS_ALLOWED_ORIGINS = [
    o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o
]
CORS_ALLOW_CREDENTIALS = True

# ============================================
# request-site 와 동일한 사내 ADFS 계정으로 로그인한다(SSO).
# AUTH_MODE=dev  → 프런트 REACT dev 로그인(로컬 개발용, ADFS 불필요)
# AUTH_MODE=sso  → 운영용 ADFS OIDC 로그인
# ============================================
AUTH_MODE = os.environ.get("AUTH_MODE", "dev")

OIDC_RP_CLIENT_ID = os.environ.get("OIDC_RP_CLIENT_ID", "")
OIDC_RP_CLIENT_SECRET = os.environ.get("OIDC_RP_CLIENT_SECRET", "")

OIDC_OP_AUTHORIZATION_ENDPOINT = os.environ.get("OIDC_OP_AUTHORIZATION_ENDPOINT", "")
OIDC_OP_LOGOUT_ENDPOINT = os.environ.get("OIDC_OP_LOGOUT_ENDPOINT", "")

OIDC_CALLBACK_BASE_URL = os.environ.get("OIDC_CALLBACK_BASE_URL", "http://localhost:8000")

OIDC_CERT_FILE_PATH = os.environ.get("OIDC_CERT_FILE_PATH", str(BASE_DIR / "api" / "certs"))
OIDC_CERT_FILE_NAME = os.environ.get("OIDC_CERT_FILE_NAME", "company.net.cer")

# 서비스용 JWT (ADFS id_token 검증 후 발급하는 자체 access/refresh 토큰)
SERVICE_JWT_SECRET_KEY = os.environ.get("SERVICE_JWT_SECRET_KEY", "")
SERVICE_JWT_ALGORITHM = os.environ.get("SERVICE_JWT_ALGORITHM", "HS256")
SERVICE_JWT_ACCESS_TOKEN_LIFETIME = timedelta(hours=12)
SERVICE_JWT_REFRESH_TOKEN_LIFETIME = timedelta(days=7)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# 메일 발송 인프라 (request-site 의 DXHUB 게이트웨이 재사용, api/mailer.py)
DXHUB_MAIL_URL = os.environ.get("DXHUB_MAIL_URL", "")
DXHUB_API_KEY = os.environ.get("DXHUB_API_KEY", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
MAIL_REDIRECT_TO = os.environ.get("MAIL_REDIRECT_TO", "")

SESSION_COOKIE_HTTPONLY = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "{levelname} {asctime} {module} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"level": "INFO", "class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "api.auth_views": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
