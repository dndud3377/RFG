import os

from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

# 로컬 개발은 ADFS 없이 dev 로그인을 기본으로 쓴다(운영에서 AUTH_MODE=sso로 덮어쓴다).
AUTH_MODE = os.environ.get("AUTH_MODE", "dev")

if not CORS_ALLOWED_ORIGINS:  # noqa: F405
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
