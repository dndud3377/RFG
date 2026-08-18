"""Cookie 기반 JWT 인증 클래스 (request-site 와 동일한 방식)."""
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import logging

logger = logging.getLogger(__name__)


class CookieJWTAuthentication(BaseAuthentication):
    """HttpOnly Cookie에 저장된 JWT(access_token)를 사용하여 인증하는 클래스."""

    keyword = 'Bearer'

    def authenticate(self, request):
        token = request.COOKIES.get('access_token')
        if not token:
            return None
        return self.authenticate_token(token)

    def authenticate_token(self, token):
        service_jwt_secret = getattr(settings, 'SERVICE_JWT_SECRET_KEY', '')
        service_jwt_algorithm = getattr(settings, 'SERVICE_JWT_ALGORITHM', 'HS256')

        if not service_jwt_secret:
            logger.error("[Auth] SERVICE_JWT_SECRET_KEY is not configured")
            raise AuthenticationFailed('JWT 시크릿 키가 설정되지 않았습니다.')

        try:
            payload = jwt.decode(
                token,
                service_jwt_secret,
                algorithms=[service_jwt_algorithm],
                options={'verify_exp': True},
            )

            User = get_user_model()
            loginid = payload.get('username')
            if not loginid:
                raise AuthenticationFailed('Invalid token payload')

            try:
                user = User.objects.get(loginid=loginid)
            except User.DoesNotExist:
                logger.info(f"[Auth] User not found, will re-provision via SSO: {loginid}")
                return None

            return (user, token)

        except ExpiredSignatureError:
            raise AuthenticationFailed('토큰이 만료되었습니다.')
        except InvalidTokenError as e:
            raise AuthenticationFailed(f'유효하지 않은 토큰입니다: {str(e)}')
