# ADFS 인증서

운영(AUTH_MODE=sso)에서 ADFS가 서명한 id_token을 검증하는 데 쓰는 인증서 파일을
이 디렉터리에 둔다. request-site와 같은 ADFS를 IdP로 쓴다면 그쪽에서 쓰는
`.cer` 파일을 그대로 복사해서 넣으면 된다.

- 파일명은 `OIDC_CERT_FILE_NAME` 환경변수로 지정한다(기본값 `company.net.cer`).
- 인증서 파일 자체는 비밀값은 아니지만 저장소에 커밋하지 않는다(`.gitignore` 대상).
