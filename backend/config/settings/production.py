import os

from .base import *  # noqa: F401,F403

DEBUG = False
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

SECURE_SSL_REDIRECT = True

# 운영은 항상 ADFS SSO 로그인(request-site 와 동일 계정)을 쓴다.
AUTH_MODE = os.environ.get("AUTH_MODE", "sso")
