from django.urls import path

from . import auth_views, auth_views_dev, views

urlpatterns = [
    path("health/", views.health, name="health"),

    # 인증 (request-site 와 동일한 사내 ADFS SSO 구조)
    path("auth/me/", auth_views.me_view, name="auth-me"),
    path("auth/refresh/", auth_views.refresh_token_view, name="auth-refresh"),
    path("auth/oidc/login/", auth_views.oidc_login_init, name="auth-oidc-login"),
    path("auth/oidc/callback/", auth_views.oidc_callback, name="auth-oidc-callback"),
    path("auth/oidc/logout/", auth_views.oidc_logout, name="auth-oidc-logout"),
    path("auth/dev-login/", auth_views_dev.dev_login_view, name="auth-dev-login"),
]
