"""개발용 로그인 (AUTH_MODE=dev 에서만 동작, ADFS 없이 로컬 확인용)."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .auth_views import user_to_dict

User = get_user_model()

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def dev_login_view(request):
    """POST /api/auth/dev-login/ — { username } → { access, refresh, user }

    AUTH_MODE=dev 환경 전용. ADFS 계정이 아직 로컬에 없어도 loginid 만으로
    즉시 만들어 로그인한다(운영에서는 항상 403).
    """
    if settings.AUTH_MODE != 'dev':
        return Response({'error': 'Not available in this environment'}, status=status.HTTP_403_FORBIDDEN)

    username = request.data.get('username', '').strip()
    if not username:
        return Response({'error': 'username을 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)

    user, _created = User.objects.get_or_create(
        loginid=username,
        defaults={'username': username, 'mail': f'{username}@example.com'},
    )

    refresh = RefreshToken.for_user(user)
    logger.info(f"[DEV] Dev login: {username}")
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': user_to_dict(user),
    })
