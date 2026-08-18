"""ADFS OIDC SSO 로그인 (request-site 와 같은 구조 — 같은 사내 계정으로 로그인한다).

request-site 와 같은 ADFS 를 IdP 로 쓰므로, 브라우저에 ADFS 세션이 남아 있으면
이 서비스에서도 재로그인 없이 곧바로 인증된다(실제 계정 판별은 ADFS 가 하고,
여기서는 매번 최신 클레임으로 로컬 UserProfile 행을 만들거나 갱신할 뿐이다).
"""
import base64
import logging
import os
import uuid
from datetime import datetime, timedelta

import jwt
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.http import HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

User = get_user_model()

logger = logging.getLogger(__name__)


def user_to_dict(user):
    """User 객체를 프론트엔드 사용자 정보로 변환"""
    return {
        'id': user.id,
        'username': user.loginid,
        'name': user.username or user.loginid,
        'department': user.deptname,
        'email': user.mail,
    }


def create_or_update_user_from_oidc(claims):
    """OIDC 클레임에서 사용자 정보를 추출하여 UserProfile 생성/업데이트."""
    login_id = claims.get('loginid') or claims.get('LoginId') or claims.get('preferred_username') or claims.get('sub')
    email = claims.get('mail') or claims.get('Mail') or claims.get('email') or claims.get('upn')
    user_name = claims.get('username') or claims.get('Username') or claims.get('name', '')
    dept_name = claims.get('deptname') or claims.get('DeptName', '')

    if not login_id:
        logger.error("[OIDC] No login_id found in claims")
        return None

    user, created = User.objects.get_or_create(
        loginid=login_id,
        defaults={'mail': email or ''},
    )

    if not created:
        user.mail = email or user.mail

    user.deptname = dept_name or ''
    user.username = user_name or ''
    user.save()

    logger.info(f"[OIDC] User {'created' if created else 'updated'}: {login_id}")
    return user


def get_adfs_public_key():
    """ADFS 인증서 파일에서 공개키를 로드합니다."""
    cert_path = getattr(settings, 'OIDC_CERT_FILE_PATH', '')
    cert_file = getattr(settings, 'OIDC_CERT_FILE_NAME', 'company.net.cer')
    full_path = os.path.join(cert_path, cert_file)

    if not os.path.exists(full_path):
        logger.error(f"[OIDC] Certificate file not found: {full_path}")
        return None

    try:
        cert_str = open(full_path, 'rb').read()
        cert_obj = x509.load_pem_x509_certificate(cert_str, default_backend())
        return cert_obj.public_key()
    except Exception as e:
        logger.error(f"[OIDC] Failed to load certificate: {e}")
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """GET /api/auth/me/ — Cookie 의 access_token → { user }"""
    return Response({'user': user_to_dict(request.user)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_token_view(request):
    """POST /api/auth/refresh/ — Cookie 의 refresh_token 으로 새 access_token 발급."""
    refresh_token = request.COOKIES.get('refresh_token')
    if not refresh_token:
        return Response({'error': '리프레시 토큰이 없습니다.'}, status=status.HTTP_401_UNAUTHORIZED)

    service_jwt_secret = getattr(settings, 'SERVICE_JWT_SECRET_KEY', '')
    service_jwt_algorithm = getattr(settings, 'SERVICE_JWT_ALGORITHM', 'HS256')
    access_token_lifetime = getattr(settings, 'SERVICE_JWT_ACCESS_TOKEN_LIFETIME', timedelta(hours=12))

    try:
        payload = jwt.decode(
            refresh_token, service_jwt_secret,
            algorithms=[service_jwt_algorithm], options={'verify_exp': True},
        )
        if payload.get('type') != 'refresh':
            return Response({'error': '유효하지 않은 토큰입니다.'}, status=status.HTTP_401_UNAUTHORIZED)

        loginid = payload.get('username')
        try:
            user = User.objects.get(loginid=loginid)
        except User.DoesNotExist:
            return Response({'error': '사용자를 찾을 수 없습니다.'}, status=status.HTTP_401_UNAUTHORIZED)

        token_payload = {
            'sub': payload.get('sub', ''),
            'username': loginid,
            'email': user.mail,
            'name': user.username,
            'department': user.deptname,
            'source': 'internal-auth',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + access_token_lifetime,
        }
        new_access_token = jwt.encode(token_payload, service_jwt_secret, algorithm=service_jwt_algorithm)

        response = Response({'success': True, 'user': user_to_dict(user)})
        response.set_cookie(
            key='access_token', value=new_access_token, httponly=True, secure=True,
            samesite='Lax', max_age=access_token_lifetime.total_seconds(), path='/',
        )
        return response

    except ExpiredSignatureError:
        return Response({'error': '리프레시 토큰이 만료되었습니다. 다시 로그인해 주세요.'}, status=status.HTTP_401_UNAUTHORIZED)
    except InvalidTokenError as e:
        logger.error(f"[Auth] Invalid refresh token: {e}")
        return Response({'error': '유효하지 않은 토큰입니다.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([AllowAny])
def oidc_login_init(request):
    """GET /api/auth/oidc/login/ — ADFS 로그인 URL 생성(nonce 는 JWT 로 봉인해 CSRF 방지)."""
    nonce_val = uuid.uuid4().urn[9:]  # 'urn:uuid:' 제거
    nonce_jwt = jwt.encode(
        {'nonce': nonce_val, 'exp': datetime.utcnow() + timedelta(minutes=10)},
        settings.SECRET_KEY, algorithm='HS256',
    )

    idp_url = getattr(settings, 'OIDC_OP_AUTHORIZATION_ENDPOINT', '')
    client_id = getattr(settings, 'OIDC_RP_CLIENT_ID', '')
    callback_url = getattr(settings, 'OIDC_CALLBACK_BASE_URL', '')
    redirect_uri = f"{callback_url}/oidc-callback"

    auth_param = (
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        "&response_mode=form_post"
        "&response_type=code+id_token"
        "&scope=openid+profile"
        f"&nonce={nonce_val}"
        f"&state={uuid.uuid4()}"
    )

    return Response({
        'redirect_url': f"{idp_url}{auth_param}",
        'nonce_jwt': nonce_jwt,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def oidc_callback(request):
    """POST /api/auth/oidc/callback/ — ADFS 로부터 받은 id_token 을 검증하고 세션용 JWT 발급."""
    id_token_val = request.POST.get('id_token') or request.data.get('id_token')
    nonce_jwt = request.POST.get('nonce_jwt') or request.data.get('nonce_jwt')

    if not id_token_val:
        return Response({'error': 'ID 토큰이 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

    public_key = get_adfs_public_key()
    if not public_key:
        return Response({'error': '인증서 로드 실패'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        decoded = jwt.decode(
            jwt=id_token_val.encode(), key=public_key, algorithms=['RS256'],
            options={'verify_signature': True, 'verify_exp': False, 'verify_aud': False},
        )
    except InvalidTokenError as e:
        logger.error(f"[OIDC] Invalid ID token: {e}")
        return Response({'error': '인증 토큰이 유효하지 않습니다.'}, status=status.HTTP_401_UNAUTHORIZED)

    id_token_nonce = decoded.get('nonce')
    if nonce_jwt and id_token_nonce:
        try:
            saved_nonce = jwt.decode(nonce_jwt, settings.SECRET_KEY, algorithms=['HS256']).get('nonce')
            if id_token_nonce != saved_nonce:
                return Response(
                    {'error': '잘못된 nonce 값입니다. CSRF 공격 가능성이 있습니다.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            logger.warning(f"[OIDC] nonce_jwt validation failed: {e}")

    user = create_or_update_user_from_oidc(decoded)
    if not user:
        return Response({'error': '사용자 생성에 실패했습니다.'}, status=status.HTTP_400_BAD_REQUEST)

    user.backend = 'django.contrib.auth.backends.ModelBackend'
    login(request, user)

    service_jwt_secret = getattr(settings, 'SERVICE_JWT_SECRET_KEY', '')
    service_jwt_algorithm = getattr(settings, 'SERVICE_JWT_ALGORITHM', 'HS256')
    access_token_lifetime = getattr(settings, 'SERVICE_JWT_ACCESS_TOKEN_LIFETIME', timedelta(hours=12))
    refresh_token_lifetime = getattr(settings, 'SERVICE_JWT_REFRESH_TOKEN_LIFETIME', timedelta(days=7))

    if not service_jwt_secret:
        logger.error("[OIDC] SERVICE_JWT_SECRET_KEY is not configured")
        return Response({'error': 'JWT 시크릿 키가 설정되지 않았습니다.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    username = decoded.get('loginid') or decoded.get('LoginId') or decoded.get('preferred_username') or decoded.get('sub', '')
    try:
        if username and '=' in username:
            decoded_username = base64.b64decode(username).decode('utf-8')
            if decoded_username:
                username = decoded_username
    except Exception:
        pass

    token_payload = {
        'sub': decoded.get('sub', ''),
        'username': username,
        'email': user.mail,
        'name': user.username,
        'department': user.deptname,
        'source': 'internal-auth',
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + access_token_lifetime,
    }
    service_access_token = jwt.encode(token_payload, service_jwt_secret, algorithm=service_jwt_algorithm)
    service_refresh_token = jwt.encode(
        {
            'sub': decoded.get('sub', ''), 'username': username, 'type': 'refresh',
            'iat': datetime.utcnow(), 'exp': datetime.utcnow() + refresh_token_lifetime,
        },
        service_jwt_secret, algorithm=service_jwt_algorithm,
    )

    logger.info(f"[OIDC] Login success: {user.loginid}")

    callback_base_url = getattr(settings, 'OIDC_CALLBACK_BASE_URL', '')
    frontend_url = f"{callback_base_url}/"
    is_json_request = request.content_type and 'application/json' in request.content_type

    if is_json_request:
        response = Response({'success': True, 'redirect_url': frontend_url, 'user': user_to_dict(user)})
    else:
        response = HttpResponseRedirect(frontend_url)

    response.set_cookie(
        key='access_token', value=service_access_token, httponly=True, secure=True,
        samesite='Lax', max_age=access_token_lifetime.total_seconds(), path='/',
    )
    response.set_cookie(
        key='refresh_token', value=service_refresh_token, httponly=True, secure=True,
        samesite='Lax', max_age=refresh_token_lifetime.total_seconds(), path='/',
    )
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def oidc_logout(request):
    """POST /api/auth/oidc/logout/ — 세션 종료 + Cookie 삭제."""
    logout(request)
    response = Response({
        'message': '로그아웃되었습니다.',
        'logout_url': getattr(settings, 'OIDC_OP_LOGOUT_ENDPOINT', ''),
    })
    response.set_cookie(key='access_token', value='', httponly=True, secure=True, samesite='Lax', max_age=0, path='/')
    response.set_cookie(key='refresh_token', value='', httponly=True, secure=True, samesite='Lax', max_age=0, path='/')
    return response
