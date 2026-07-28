# RFG 버그 · 잠재 위험 보고서

> 검증 기준 커밋: `a629c05` / 작성일 2026-07-28
> 테스트 절차와 재현 방법은 [`TEST_PLAN.md`](./TEST_PLAN.md) 참고
> 아래 항목은 **모두 실제로 실행해서 확인**했습니다. 추측만으로 적은 항목은 없으며,
> Docker 데몬이 없어 컨테이너로 직접 확인하지 못한 항목은 그 사실을 명시했습니다.

---

## 0. 총평

| 심각도 | 건수 | 항목 |
|---|---|---|
| 🔴 Blocker | 1 | B-01 |
| 🔴 Critical | 2 | B-02, B-03 |
| 🟠 High | 7 | B-04 ~ B-10 |
| 🟡 Medium | 12 | B-11 ~ B-18, B-21 ~ B-24, B-27 |
| 🟢 Low | 5 | B-19, B-20, B-25, B-26 |

**핵심 3줄 요약**

1. 테스트하려던 **"의뢰서 작성 → 이력 조회" 기능은 저장소 어디에도 존재하지 않습니다.** 현재 RFG는 도구 목록을 검색해 보여주는 껍데기 + Django 헬스체크 1개가 전부입니다.
2. **운영 배포 설정이 현재 상태로는 동작하지 않습니다.** `.env.example`대로 배포하면 전 요청 400, 값을 채워도 `/api/`·`/admin/`이 무한 https 리다이렉트로 접속 불가입니다.
3. 앞으로 만들 의뢰서 기능이 **바로 얹힐 수 없는 토대**입니다 — CSRF 미들웨어 없음, 인증 체계 없음, DB가 재기동마다 초기화됨. 이 세 가지는 기능 구현 **전에** 잡아야 합니다.

---

## 1. 🔴 Blocker

### B-01 — 의뢰서 작성 ~ 이력 조회 플로우 전체 미구현

| 항목 | 내용 |
|---|---|
| **심각도** | 🔴 Blocker |
| **위치** | 저장소 전체 |
| **분류** | 기능 부재 |

**확인한 사실**

| 조사 항목 | 결과 |
|---|---|
| 프론트 라우트 | `/`, `/tools/:toolId`, `*` 3개뿐 (`frontend/src/App.jsx:11-14`) |
| 화면의 `<form>` 개수 | **0개**. `<input>`은 홈 검색창 1개뿐 |
| `/request`, `/requests`, `/history`, `/tools/history` | 라우트 없음 → 전부 홈 또는 "준비 중"으로 조용히 폴백 |
| 도구 4종 상태 | `ebeam`/`numbering`/`rcc`/`layerConvert` 모두 `ready: false` |
| 백엔드 API | `GET /api/health/` 1개 (`backend/api/urls.py`) |
| 백엔드 모델·마이그레이션 | **0개**. `backend/api/models.py` 파일 자체가 없음 |
| 과거 커밋 | 전체 이력(6커밋)을 조사했으나 의뢰서/이력 관련 코드가 존재한 적 없음 |

**영향**
"의뢰서 작성부터 이력 조회까지 모든 케이스를 테스트한다"는 목표를 현재 코드로는 **한 건도 실행할 수 없습니다.**

**권고**
[`TEST_PLAN.md`](./TEST_PLAN.md) 10장에 의뢰서 작성(TC-REQ 11건) · 상태 전이(TC-FLOW 5건) · 이력 조회(TC-HIST 10건) 케이스를 미리 설계해 두었습니다. 기능 구현과 동시에 그대로 사용하시면 됩니다.
단, 구현 착수 **전에** B-02 ~ B-06을 먼저 처리해야 합니다(5장 참고).

---

## 2. 🔴 Critical

### B-02 — 운영 스택에서 `/api/`·`/admin/`이 무한 HTTPS 리다이렉트로 접속 불가

| 항목 | 내용 |
|---|---|
| **심각도** | 🔴 Critical |
| **위치** | `backend/config/settings/production.py:15`, `nginx/nginx.conf:10`, `docker-compose.yml:30-36` |
| **분류** | 배포 설정 |

**원인 조합**
- `production.py:15` → `SECURE_SSL_REDIRECT = True`
- `nginx/nginx.conf` → `listen 80;` 만 존재. **TLS 리스너 없음**
- nginx가 백엔드로 `X-Forwarded-Proto` 를 **보내지 않음**
- settings에 `SECURE_PROXY_SSL_HEADER` **미설정**

→ Django는 모든 요청을 평문으로 인식해 무조건 https로 301하는데, 그 https 주소에는 아무것도 없습니다.

**재현 (실측 로그)**

```
$ DJANGO_SETTINGS_MODULE=config.settings.production \
  DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1" DJANGO_SECRET_KEY=x \
  gunicorn config.wsgi:application --bind 127.0.0.1:8012
$ curl -i http://127.0.0.1:8012/api/health/
HTTP/1.1 301 Moved Permanently
Location: https://127.0.0.1:8012/api/health/     ← 이 주소는 서비스되지 않음
```

**영향**
`docker compose up` 후 `http://localhost:8080/api/health/` 및 `/admin/` 이 **전부 사용 불가**.
프론트 정적 페이지는 nginx→frontend 경로라 살아 있어서, **"화면은 뜨는데 API만 죽는"** 가장 찾기 어려운 형태의 장애가 됩니다. 의뢰서 등록 API를 붙이는 순간 바로 터집니다.

> Docker 데몬이 없어 컨테이너로 직접 확인하지는 못했으나, nginx가 백엔드에 전달하는 것과 **동일한 조건(평문 HTTP + 운영 settings + gunicorn)** 을 로컬에서 재현해 위 301을 실측했습니다.

**수정 제안**
```python
# production.py — TLS를 nginx 앞단에서 종료하는 구조라면
SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SECURE_SSL_REDIRECT", "0") == "1"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```
```nginx
# nginx/nginx.conf — 프록시 3곳 모두에 추가
proxy_set_header X-Forwarded-Proto $scheme;
```

---

### B-03 — `.env.example` 그대로 배포하면 모든 요청이 400

| 항목 | 내용 |
|---|---|
| **심각도** | 🔴 Critical |
| **위치** | `backend/config/settings/production.py:6`, `.env.example` |
| **분류** | 배포 설정 |

`ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")`
→ 값이 비면 `[""]` 라는 **의미 없는 리스트**가 되고, 빈 리스트가 아니라서 Django의 "DEBUG=False면 반드시 설정" 경고에도 안 걸립니다.

`.env.example`에는 `DJANGO_ALLOWED_HOSTS=` 로 **빈 값**만 있고 README에도 채우라는 안내가 없습니다.

**재현 (실측)**
```
$ DJANGO_ALLOWED_HOSTS="" gunicorn config.wsgi:application --bind 127.0.0.1:8011
$ curl -i http://127.0.0.1:8011/api/health/
HTTP/1.1 400 Bad Request
```

**수정 제안**
```python
_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS", "")
ALLOWED_HOSTS = [h.strip() for h in _hosts.split(",") if h.strip()]
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS 를 설정하세요.")
```
그리고 `.env.example`에 `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1` 같은 예시 값을 넣습니다.

---

## 3. 🟠 High

### B-04 — CSRF 미들웨어 누락 (의뢰서 POST를 붙이는 순간 무방비)

| 항목 | 내용 |
|---|---|
| **심각도** | 🟠 High |
| **위치** | `backend/config/settings/base.py:17-22` |

`MIDDLEWARE`에 `django.middleware.csrf.CsrfViewMiddleware`가 **없습니다.**
`SessionMiddleware`와 `AuthenticationMiddleware`는 있어서 세션 로그인은 되는데 CSRF만 빠진, 가장 위험한 조합입니다.

**실측**
```
$ DJANGO_SETTINGS_MODULE=config.settings.production python manage.py check --deploy
?: (security.W003) You don't appear to be using Django's built-in cross-site
   request forgery protection via the middleware ...
```

**영향**
지금은 GET 엔드포인트뿐이라 실피해가 없지만, **의뢰서 등록/수정/삭제 API를 추가하는 즉시** 외부 사이트에서 로그인된 사용자의 브라우저로 임의의 의뢰서를 생성·변조할 수 있게 됩니다. B-01 기능 구현 **전에** 반드시 수정해야 합니다.

**수정 제안**: `MIDDLEWARE`의 `CommonMiddleware` 다음에 `"django.middleware.csrf.CsrfViewMiddleware"` 추가.

---

### B-05 — 운영에서도 기본 `SECRET_KEY`로 조용히 기동

| 항목 | 내용 |
|---|---|
| **심각도** | 🟠 High |
| **위치** | `backend/config/settings/base.py:6` |

```python
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key")
```
`.env.example`의 `DJANGO_SECRET_KEY=` 도 빈 값이라, 그대로 배포하면 **소스에 공개된 `insecure-dev-key`** 로 운영이 뜹니다.
세션 쿠키·CSRF 토큰·비밀번호 재설정 토큰 서명이 전부 예측 가능해집니다.

**실측**: `check --deploy` → `security.W009` 경고.

**수정 제안**: 운영 설정에서는 기본값 없이 `os.environ["DJANGO_SECRET_KEY"]` 로 읽어 미설정 시 기동 실패시키기.

---

### B-06 — 컨테이너 재기동/재배포마다 DB 전량 소실 (이력이 남지 않음)

| 항목 | 내용 |
|---|---|
| **심각도** | 🟠 High |
| **위치** | `docker-compose.yml:2-14`, `backend/config/settings/production.py:8-13` |

운영 DB가 `BASE_DIR / "db.sqlite3"` — **컨테이너 파일시스템 내부**입니다.
`docker-compose.yml`이 마운트하는 볼륨은 `static_data:/app/staticfiles` **하나뿐**이라 DB 파일은 볼륨 밖에 있습니다.

**영향**
- `docker compose up --build` 할 때마다 데이터 초기화
- 컨테이너 재생성 시 초기화
- **"이력 조회" 기능의 존재 의의 자체가 성립하지 않음**
- sqlite는 다중 워커 동시 쓰기에서 `database is locked` 위험도 있음 (gunicorn 기본 워커 수 기준)

**수정 제안**: 최소한 `- db_data:/app/data` 볼륨 + `NAME: BASE_DIR/"data"/"db.sqlite3"`.
의뢰서/이력처럼 쓰기 동시성이 있는 업무 데이터는 **PostgreSQL 전환**을 권장합니다.

---

### B-07 — 보안 헤더 3종 미설정 (클릭재킹 / HSTS / 세션 쿠키)

| 항목 | 내용 |
|---|---|
| **심각도** | 🟠 High |
| **위치** | `backend/config/settings/base.py:17-22`, `production.py` |

`check --deploy` 실측 경고:

| 코드 | 내용 | 결과 |
|---|---|---|
| security.W002 | `XFrameOptionsMiddleware` 없음 | `X-Frame-Options` 헤더 미발급 → **클릭재킹 가능** |
| security.W004 | `SECURE_HSTS_SECONDS` 미설정 | HTTPS 강제 불가 |
| security.W012 | `SESSION_COOKIE_SECURE` 미설정 | 세션 쿠키가 평문 전송될 수 있음 |

**수정 제안**
```python
# base.py MIDDLEWARE 에 추가
"django.middleware.clickjacking.XFrameOptionsMiddleware",

# production.py
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```
※ HSTS는 실제 TLS가 붙은 뒤에 켜야 합니다(B-02 선행).

---

### B-08 — 알려진 취약점이 있는 의존성 5건

| 항목 | 내용 |
|---|---|
| **심각도** | 🟠 High |
| **위치** | `frontend/package.json`, `package-lock.json` |

`npm audit` 실측 — **high 2건 / moderate 3건**:

| 패키지 | 심각도 | 내용 |
|---|---|---|
| `postcss` ≤8.5.17 | **high** | sourceMappingURL 경로 탐색 → 임의 `.map` 파일 노출 |
| `esbuild` ≤0.24.2 | moderate | 개발 서버에 임의 사이트가 요청을 보내고 응답을 읽을 수 있음 |
| `vite` ≤6.4.2 | moderate | 위 `esbuild` 의존 |
| `react-router` 6.0.0~7.17.0 | moderate | `<Link>`/`useNavigate` 백슬래시를 통한 **오픈 리다이렉트** (CVE-2025-68470 우회) |
| `react-router` (동일) | moderate | SSR 하이드레이션 `deserializeErrors()` 임의 생성자 주입 |

**참고**: `postcss`·`react-router`는 `npm audit fix`로 해결됩니다. `vite`/`esbuild`는 메이저 업그레이드(vite@8)가 필요하므로 별도 계획이 필요합니다.
`esbuild` 건은 개발 서버 한정이므로, 개발 서버를 외부에 노출하지 않는 것으로 완화할 수 있습니다.

---

### B-09 — `ready: true`인데 라우트가 없으면 "바로 사용" 배지 + "준비 중" 화면

| 항목 | 내용 |
|---|---|
| **심각도** | 🟠 High |
| **위치** | `frontend/src/App.jsx:13-14`, `frontend/src/components/ToolCard.jsx:14-32`, `frontend/src/data/catalog.js` |
| **분류** | 회귀 함정 (미래에 반드시 밟게 될 지뢰) |

`App.jsx`의 `<Route path="/tools/:toolId" element={<ComingSoon />} />`가 **모든** `/tools/*` 를 흡수합니다.
따라서 `catalog.js`에서 `ready: true`로 바꿔도 전용 라우트를 등록하지 않으면 **아무 경고 없이** ComingSoon이 뜹니다.

**재현 (실측)**

1. `catalog.js`의 `ebeam` → `ready: true`
2. `npm run build` → **성공** (경고 0)
3. 홈: 배지 `["바로 사용","준비 중","준비 중","준비 중"]` — 클릭 활성화됨
4. 클릭 → `/tools/ebeam` 이동 → **화면 제목 "준비 중인 도구입니다"**
5. 콘솔 에러 0건

**영향**
의뢰서 화면을 만들어 `ready: true`로 올렸는데 라우트 등록을 빠뜨리면, 사용자에게는 "바로 사용" 이라고 광고하면서 실제로는 "준비 중"만 보여줍니다. QA가 카드 목록만 보고 통과시키기 쉽습니다.

**수정 제안**
- `App.jsx`의 `/tools/:toolId` 를 catch-all 대신 **명시적 라우트 + 미등록 시 404**로 변경, 또는
- `catalog.js` 항목에 `element`/`component`를 직접 들고 `App.jsx`가 이를 순회해 라우트를 생성 (등록 누락이 구조적으로 불가능해짐)
- 최소한 회귀 체크리스트에 "ready:true ⇔ 라우트 존재" 확인을 넣기 ([`TEST_PLAN.md`](./TEST_PLAN.md) 12장)

---

### B-10 — i18n 키를 빠뜨리면 화면에 키 문자열이 그대로 노출 (규칙 1에 강제 장치 없음)

| 항목 | 내용 |
|---|---|
| **심각도** | 🟠 High |
| **위치** | `frontend/src/i18n.js`, `frontend/src/locales/ko.json` |

`i18next`는 키가 없으면 **키 문자열 자체를 반환**하는데, `saveMissing`·`missingKeyHandler`·빌드 시 검증이 아무것도 없습니다.

**재현 (실측)**

1. `catalog.js`에 `ko.json`에 없는 키를 쓰는 항목 추가 (`nameKey: 'tools.ghost.name'` 등)
2. `npm run build` → **성공**
3. 홈 화면 카드에 그대로 출력:
   - 이름: `tools.ghost.name`
   - 설명: `tools.ghost.desc`
   - 아이콘 자리: `tools.ghost.icon`
4. 콘솔 경고 0건

**영향**
CLAUDE.md 규칙 1("문구는 ko.json 한 곳에서만")은 **문서상의 약속일 뿐 코드가 강제하지 않습니다.**
새 도구를 추가하다 키 하나만 빠뜨려도 사용자 화면에 개발자용 키가 노출됩니다.

**수정 제안**
- 개발 환경에서 `missingKeyHandler`로 콘솔 경고 + `debug: true`
- CI(또는 `npm run lint:i18n`)에 [`TEST_PLAN.md`](./TEST_PLAN.md) 6장의 키 대조 스크립트를 등록해 **미정의 키가 있으면 빌드 실패**

---

## 4. 🟡 Medium

### B-11 — 검색이 도구 **이름**만 대상 (설명문 검색 불가)

| 항목 | 내용 |
|---|---|
| **위치** | `frontend/src/pages/Home.jsx:14` |

```js
return tools.filter((tool) => t(tool.nameKey).toLowerCase().includes(q))
```
`descKey`를 보지 않습니다.

**실측**

| 입력 | 기대 | 실제 |
|---|---|---|
| `레이어` (설명: "레이어 정보를 원하는 형식으로 변환합니다.") | 1장 | **0장** |
| `RCC 목록` (설명: "RCC 목록을 조회하고 관리합니다.") | 1장 | **0장** |

사용자는 도구의 **정식 명칭**(`Layer Information Convert`)을 이미 알아야만 검색할 수 있습니다. 도구가 늘어날수록 검색 기능이 무용지물이 됩니다.

**수정 제안**: `t(tool.nameKey) + ' ' + t(tool.descKey)` 를 대상으로 매칭. 별칭(`aliasKey`) 도입도 검토.

---

### B-12 — 한글 IME 조합 중 "검색 결과가 없습니다" 깜빡임

| 항목 | 내용 |
|---|---|
| **위치** | `frontend/src/pages/Home.jsx:36-39` |

`onChange`에 즉시 반응하고 `compositionstart/end` 처리나 디바운스가 없습니다.
"채번"을 입력하는 도중 `ㅊ` 상태에서 매칭 0건 → 빈 화면 문구가 번쩍이고 다시 카드가 돌아옵니다. (실측: `ㅊ` → 0장)

**수정 제안**: `onCompositionStart/End`로 조합 중 필터 보류, 또는 150~200ms 디바운스.

---

### B-13 — 모바일에서 내비게이션 접근 불가 (햄버거 메뉴 없음)

| 항목 | 내용 |
|---|---|
| **위치** | `frontend/src/styles/global.css:254-256` |

```css
@media (max-width: 560px) { .navbar__links { display: none; } }
```
숨기기만 하고 **대체 수단이 없습니다.** 실측: 390px 뷰포트에서 `.navbar__links` 비표시, 페이지 내 `<button>` **0개**.
"홈 / 도구 / 도움말" 어디에도 갈 수 없습니다(로고 클릭으로 홈 이동만 가능).

**수정 제안**: 햄버거 토글 + 드로어 추가. 문구는 `ko.json`에 `nav.menuOpen`/`nav.menuClose` 등으로 정의(규칙 1).

---

### B-14 — 앵커 이동 시 스티키 헤더가 콘텐츠를 가림

| 항목 | 내용 |
|---|---|
| **위치** | `frontend/src/styles/global.css:68`(sticky), `:73`(height 64px), `#tools`/`#help` 대상 요소 |

**실측** (`/#tools` 진입 후 스크롤 안정화 시점)
```
document.querySelector('.navbar').getBoundingClientRect().bottom  → 65
document.querySelector('#tools').getBoundingClientRect().top      → 0
```
섹션 상단이 뷰포트 y=0에 오는데 헤더가 65px를 덮고 있어 **검색창 윗부분이 잘려 보입니다.**

**수정 제안**
```css
#tools, #help { scroll-margin-top: 80px; }
```

---

### B-15 — 404가 없어 잘못된 URL이 "정상 화면"처럼 보임

| 항목 | 내용 |
|---|---|
| **위치** | `frontend/src/App.jsx:13-14` |

**실측**

| URL | 실제 결과 |
|---|---|
| `/tools/does-not-exist` (없는 도구 id) | **"준비 중인 도구입니다"** 정상 화면 |
| `/totally/unknown/path` | **조용히 홈 렌더** |

카탈로그에 없는 `toolId`인지 검증하지 않고, `path="*"`가 모든 오류 경로를 홈으로 삼킵니다.

**영향**
- 오타 URL·깨진 링크를 아무도 눈치채지 못함
- 검색엔진에 유령 URL이 200으로 인덱싱됨
- 이력 상세(`/history/:id`)처럼 **id 기반 화면이 생기면 "없는 데이터"와 "정상"이 구분되지 않음** — 이게 진짜 문제입니다

**수정 제안**: `toolId`가 `catalog.tools`에 있는지 검증하고, 없으면 `NotFound` 페이지 렌더. `path="*"`도 `NotFound`로.

---

### B-16 — 검색·필터 상태가 URL에 없어 새로고침/뒤로가기 시 소실

| 항목 | 내용 |
|---|---|
| **위치** | `frontend/src/pages/Home.jsx:9` (`useState`만 사용) |

**실측**

| 조작 | 결과 |
|---|---|
| `채번` 검색 후 URL | `http://localhost:4173/` (상태 없음) |
| 검색 후 새로고침 | 입력값 `""`, 카드 4장으로 초기화 |
| 검색 → 도구 진입 → 뒤로가기 | 입력값 `""` 로 초기화 |

**영향**
지금은 도구 4개라 사소하지만, **이력 조회 화면(기간·상태·페이지 필터)에서 같은 패턴을 쓰면 치명적**입니다.
"상세 보고 뒤로 가면 필터가 날아가는" 전형적인 업무 시스템 불만 사항이 됩니다. (TC-HIST-06)

**수정 제안**: `useSearchParams`로 상태를 쿼리스트링에 반영.

---

### B-17 — 접근성 미흡 (레이블·포커스·대체텍스트)

| 항목 | 내용 |
|---|---|
| **위치** | `frontend/src/pages/Home.jsx:33-40`, `frontend/src/components/ToolCard.jsx:9,22` |

**실측**

| 항목 | 결과 |
|---|---|
| 검색 `<input>` | `aria-label` **없음**, `<label>` **없음** (placeholder만) |
| "준비 중" 카드 | `<div aria-disabled="true">` — `role`·`tabindex` 없음 → **키보드 포커스 불가**, 스크린리더가 항목으로 인식 못 함 |
| 아이콘 이모지(🔬🔢📋🗂️) | `aria-hidden` 없음 → 스크린리더가 "현미경" 등을 그대로 읽음 |
| 페이지 내 `<button>` | 0개 (모든 상호작용이 `<a>`/`<div>`) |

**수정 제안**: 검색창에 `aria-label={t('home.search.label')}`, 카드에 `role="listitem"` + 그리드에 `role="list"`, 이모지에 `aria-hidden="true"`. 새 문구는 `ko.json`에 추가(규칙 1).

---

### B-18 — 문서·메타데이터가 실제 코드와 불일치

| 항목 | 내용 |
|---|---|
| **위치** | `README.md`, `CLAUDE.md`, `frontend/index.html`, `frontend/package.json` |

`bea3e2a` 커밋에서 금융 도구를 엔지니어링 도구로 교체했는데 **문서와 메타데이터가 따라가지 않았습니다.**

| 파일 | 기재된 내용 | 실제 |
|---|---|---|
| `README.md` | "🏦 대출·이자 계산기 — 동작하는 도구" | `LoanCalculator.jsx` **삭제됨** |
| `README.md` | "📊 예산·가계부 — 동작하는 도구" | `Budget.jsx` **삭제됨** |
| `README.md` | "좌측 사이드바에서 카테고리를 선택하면 필터링" | 사이드바·카테고리 **제거됨**, 검색만 존재 |
| `README.md` | 구조도에 `utils/format.js`, `utils/loan.js` | **삭제됨** (`utils/` 디렉터리 자체 없음) |
| `README.md` | "환율·투자수익률·세금·저축목표·구독관리…" 9개 도구 | 실제 4개 (ebeam/채번/RCC/Layer) |
| `CLAUDE.md` 규칙 2 | `catalog.js`에 `category`, `tagKey` 필수 | **둘 다 없음** |
| `index.html` `<title>` | `RFG · Smart Finance Toolkit` | 금융 서비스 아님 |
| `index.html` `<meta description>` | "대출 계산, 예산 관리 등 금융 도구" | 실제와 무관 |
| `package.json` `description` | "금융 도구를 카테고리별로 모아 제공" | 실제와 무관 |

**영향**
새 기여자(사람이든 AI 에이전트든)가 README/CLAUDE.md를 신뢰하고 작업하면 존재하지 않는 구조를 전제로 코드를 짭니다. **CLAUDE.md는 이 저장소의 규칙 문서인 만큼, 규칙 2가 실제와 어긋난 것은 특히 위험합니다.**

---

### B-21 — 테스트·린트·CI가 전무

| 항목 | 내용 |
|---|---|
| **위치** | 저장소 전체 |

**실측**

| 항목 | 결과 |
|---|---|
| `frontend/package.json` scripts | `dev`, `build`, `preview` **3개뿐** (test/lint 없음) |
| 테스트 프레임워크 | 프론트·백엔드 **모두 없음** |
| Django 테스트 | `backend/api/tests.py` **없음** |
| `.github/` | **디렉터리 자체 없음** → CI 파이프라인 없음 |
| 린터/포매터 설정 | ESLint·Prettier·ruff·black 설정 **없음** |

**영향**
B-09(라우트 누락)·B-10(i18n 키 누락)처럼 **기계가 잡아야 하는 종류의 실수**를 잡을 그물이 없습니다. 이 보고서의 검증도 전부 임시 스크립트로 수행했습니다.

**수정 제안**: 최소 구성으로 `vitest` + `@testing-library/react`, `eslint`, 그리고 `push` 시 `npm run build` + `manage.py check --deploy` + i18n 키 대조를 도는 GitHub Actions 워크플로.

---

### B-22 — 개발/운영 nginx의 업로드 용량 제한 불일치

| 항목 | 내용 |
|---|---|
| **위치** | `nginx/nginx.conf:13` vs `nginx/nginx.dev.conf` |

| 설정 | 운영(`nginx.conf`) | 개발(`nginx.dev.conf`) |
|---|---|---|
| `client_max_body_size` | `20M` | **없음 → nginx 기본 1M** |
| `gzip` | 켜짐 | **없음** |
| `proxy_read_timeout` | `90` | **없음 → 기본 60s** |

**영향**
의뢰서에 **파일 첨부**가 생기면 "개발에서는 5MB 업로드가 413으로 실패하는데 운영에서는 성공"하는 환경 의존 버그가 발생합니다. 반대로 운영에서 90초까지 버티는 요청이 개발에서는 60초에 끊깁니다. 재현 불가 이슈의 전형적 원인입니다.

**수정 제안**: 공통 설정을 `include` 파일로 분리하거나, dev 설정에도 동일 값 명시.

---

### B-23 — 개발용 Docker 스택에서 프론트엔드 코드 수정이 반영되지 않음

| 항목 | 내용 |
|---|---|
| **위치** | `docker-compose.dev.yml:20-28` |

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile      # ← 운영용 멀티스테이지(빌드→nginx 정적 서빙)
  # volumes 없음, command 오버라이드 없음
```

백엔드는 `./backend:/app` 마운트 + `runserver`로 핫리로드가 되는데, 프론트엔드는 **운영과 동일한 정적 빌드**입니다.
`.jsx`를 고쳐도 `docker compose build frontend` 전까지 아무 변화가 없고, Vite HMR도 동작하지 않습니다.

**영향**
"개발 환경"이라는 이름과 실제 동작이 달라 개발자가 캐시 문제로 오인하고 시간을 낭비합니다.

**수정 제안**: dev용 `Dockerfile.dev`(node + `npm run dev`) + `./frontend:/app` 마운트 + `/app/node_modules` 익명 볼륨, 또는 README에 "프론트는 `npm run dev`로 별도 실행" 명시.

---

### B-24 — DRF 기본 설정 부재 (인증 없음 + Browsable API 운영 노출)

| 항목 | 내용 |
|---|---|
| **위치** | `backend/config/settings/base.py` (`REST_FRAMEWORK` 설정 자체가 없음) |

DRF 기본값이 그대로 적용됩니다.
- `DEFAULT_PERMISSION_CLASSES` = `AllowAny` → **모든 API가 무인증 공개**
- `DEFAULT_RENDERER_CLASSES`에 `BrowsableAPIRenderer` 포함 → **운영에서도 HTML 탐색 UI 노출**
- `DEFAULT_THROTTLE_CLASSES` 없음 → **레이트리밋 없음**
- `DEFAULT_PAGINATION_CLASS` 없음 → 목록 API가 전건 반환

**실측**
```
$ curl -H "Accept: text/html" http://127.0.0.1:8010/api/health/
<!DOCTYPE html>      ← DRF Browsable API HTML
```
(`REST_FRAMEWORK` 설정이 `base.py`에 없으므로 운영 설정도 동일합니다.)

**영향**
헬스체크만 있는 지금은 무해하지만, **의뢰서 API를 추가하면 그 순간부터 인증·페이지네이션·레이트리밋 없이 공개**됩니다. B-04(CSRF)와 함께 기능 구현 전 선결 과제입니다.

**수정 제안**
```python
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}
```
(개발 설정에서만 `BrowsableAPIRenderer`를 추가)

---

### B-27 — 개발 설정의 DEBUG 화면이 내부 구조를 노출

| 항목 | 내용 |
|---|---|
| **위치** | `backend/config/settings/development.py:3-4`, `docker-compose.dev.yml` (8081 포트 공개) |

`DEBUG = True` + `ALLOWED_HOSTS = ["*"]` 조합입니다.

**실측**: 없는 URL 접근 시 Django 디버그 페이지가 **URLconf 전체 목록·설정 정보**를 그대로 출력합니다.
예외 발생 시에는 소스 코드 조각과 지역 변수(환경변수 포함)까지 노출됩니다.

**영향**
개발 스택은 `8081` 포트를 호스트에 바인딩하므로, 사내망·클라우드 인스턴스에 개발 스택을 띄우면 접근 가능한 누구에게나 내부 구조가 공개됩니다.

**수정 제안**: dev 포트를 `127.0.0.1:8081:80`으로 바인딩해 로컬 전용으로 제한. 공유 개발 서버라면 `ALLOWED_HOSTS`를 명시 목록으로.

---

## 5. 🟢 Low

### B-19 — 페이지별 `<title>`/메타 태그가 없음
전 페이지가 `RFG · Smart Finance Toolkit` 로 동일합니다(실측: `/`와 `/tools/rcc` 동일). 브라우저 탭·북마크·검색결과에서 화면을 구분할 수 없습니다. 이력 상세 화면이 생기면 더 문제가 됩니다. → `react-helmet` 등으로 화면별 title 설정(문구는 `ko.json`).

### B-20 — 죽은 코드 / 죽은 문구
| 대상 | 상태 |
|---|---|
| `frontend/src/hooks/useLocalStorage.js` | **참조 0회** (`Budget.jsx` 삭제 후 고아) |
| `ko.json` 미사용 키 7개 | `app.tagline`, `common.reset`, `common.calculate`, `common.won`, `common.percent`, `common.months`, `common.years` — 삭제된 금융 계산기의 잔재 |

기능에는 영향이 없으나, `ko.json`이 "단일 소스"로서 신뢰를 잃고 번역 시 불필요한 비용이 됩니다.

### B-25 — nginx가 `/admin/`을 프록시하지만 Django admin이 설치되지 않음
`nginx/nginx.conf:27-31`가 `/admin/`을 백엔드로 보내지만 `INSTALLED_APPS`에 `django.contrib.admin`이 없고 `config/urls.py`에도 admin 경로가 없습니다. 실측 결과 **404**.
`/api/` 루트도 404입니다(API 인덱스 없음).
→ admin을 쓸 계획이면 앱·URL·`django.contrib.messages`를 추가하고, 아니라면 nginx에서 `/admin/` 블록을 제거하는 게 공격면 축소에 유리합니다.

### B-26 — 빌드 재현성 및 기동 순서
- `frontend/Dockerfile:7` — `package-lock.json`이 있는데도 `npm install` 사용 → **잠금 파일이 무시되어 빌드마다 의존성이 달라질 수 있음**. `npm ci` 권장.
- `docker-compose.yml` / `docker-compose.dev.yml` — `depends_on`에 `condition: service_healthy`와 healthcheck가 없어 nginx가 백엔드보다 먼저 떠서 초기 502가 날 수 있음. `/api/health/`가 이미 있으니 healthcheck로 연결하면 됩니다.

---

## 6. 잠재적 위험 — 의뢰서/이력 기능을 얹기 전에 알아야 할 것

개별 버그와 별개로, **현재 토대 위에 B-01 기능을 그대로 구현하면 반복될 구조적 위험**입니다.

### 6-A. 선결 과제 (기능 구현 **전에** 처리 권장)

| 순위 | 항목 | 이유 |
|---|---|---|
| 1 | **B-04 CSRF** | 첫 POST 엔드포인트가 생기는 순간 무방비. 나중에 넣으면 기존 프론트 요청을 전부 손봐야 함 |
| 2 | **B-24 DRF 인증/권한** | 의뢰서는 "누가 썼는지"가 데이터 모델의 근간. 인증 없이 만들면 스키마부터 다시 짜야 함 |
| 3 | **B-06 DB 영속성** | 이력이 남지 않는 이력 조회는 의미가 없음. sqlite → PostgreSQL 결정은 빠를수록 저렴 |
| 4 | **B-02/B-03 배포 설정** | 지금 고치면 5줄, 기능이 얹힌 뒤 장애로 마주치면 원인 파악에 훨씬 오래 걸림 |
| 5 | **B-21 CI** | B-09·B-10 같은 함정은 사람이 아니라 파이프라인이 잡아야 함 |

### 6-B. 설계 단계에서 미리 정해야 할 것

| 영역 | 위험 | 지금 상태 |
|---|---|---|
| **인증/인가** | 남의 의뢰서를 URL 조작으로 조회(IDOR). 이력 조회는 IDOR가 가장 흔한 취약점 | 인증 체계 자체가 없음 |
| **개인정보** | 의뢰서에 담당자명·연락처·사번이 들어가면 개인정보 처리 대상 | 마스킹·보관기간·접근로그 정책 없음 |
| **감사 로그** | "누가 언제 무엇을 바꿨나"를 사후에 못 만듦 — 이력 기능의 핵심 | 모델·로깅 설정 모두 없음 (`LOGGING` 미설정) |
| **동시성** | 두 명이 같은 의뢰를 동시에 수정하면 나중 저장이 앞 저장을 덮어씀 | 낙관적 잠금 개념 없음. sqlite는 동시 쓰기에 취약 |
| **대용량** | 이력이 수만 건이 되면 목록 조회가 느려짐 | 페이지네이션·인덱스 기본값 없음(B-24) |
| **파일 첨부** | 확장자 위장, 실행 파일 업로드, 저장 경로 탐색 | 업로드 경로 자체가 없고, 환경별 용량 제한도 불일치(B-22) |
| **상태 전이** | 클라이언트만 막고 서버가 안 막으면 API 직접 호출로 임의 상태 변경 가능 | 상태 머신 없음 |
| **내보내기** | CSV/엑셀 다운로드 시 CSV 인젝션(`=cmd\|...`), 한글 깨짐 | 기능 없음 |
| **알림** | 의뢰 접수/완료 메일·메신저 발송 실패 시 무한 재시도·중복 발송 | 기능 없음 |

### 6-C. 프론트엔드에서 반복될 패턴

현재 홈 화면의 결함이 그대로 이력 조회 화면으로 복사될 가능성이 높습니다.

| 홈 화면의 문제 | 이력 조회에서 커지는 형태 |
|---|---|
| B-16 상태가 URL에 없음 | 필터·페이지 조건이 뒤로가기·새로고침·링크 공유에서 전부 소실 |
| B-15 404 없음 | 존재하지 않는 의뢰번호가 "정상 화면"처럼 보임 |
| B-12 IME 미처리 | 한글 검색어 입력 중 목록이 매번 깜빡임 |
| B-11 이름만 검색 | 의뢰번호·요청자·내용 중 무엇으로 검색되는지 사용자가 알 수 없음 |
| B-17 접근성 | 표 형태 목록에서 스크린리더·키보드 사용자가 아예 사용 불가 |
| 로딩/에러 UI 부재 | 현재 화면에는 로딩 스피너·에러 배너·재시도 버튼이 하나도 없음. API 연동 시 전부 새로 설계해야 함 |

### 6-D. 문서 신뢰도

**B-18이 가장 조용하지만 넓게 퍼지는 위험입니다.** `README.md`는 존재하지 않는 대출 계산기·예산 가계부·카테고리 사이드바를 "동작하는 기능"으로 설명하고, `CLAUDE.md` 규칙 2는 코드에 없는 `category`/`tagKey`를 필수로 규정합니다.
CLAUDE.md는 **AI 에이전트가 매 작업마다 읽는 규칙 문서**이므로, 여기가 틀리면 잘못된 전제가 코드에 계속 재생산됩니다. 기능 개발보다 먼저 정리하는 것을 권합니다.

---

## 7. 권장 처리 순서

| 단계 | 항목 | 예상 규모 |
|---|---|---|
| **1. 즉시** | B-02, B-03 (운영 배포 정상화), B-05 (SECRET_KEY) | 설정 파일 몇 줄 |
| **2. 문서 정리** | B-18 (README·CLAUDE.md·index.html 메타 현행화) | 문서 수정 |
| **3. 기능 구현 전 토대** | B-04, B-24, B-06, B-07 | 설정 + DB 구조 결정 |
| **4. 안전망 구축** | B-21 (CI), B-09·B-10 (자동 검증 스크립트) | 워크플로 1개 + 스크립트 2개 |
| **5. UX 결함** | B-11, B-12, B-13, B-14, B-15, B-16, B-17 | 프론트 수정 |
| **6. B-01 기능 개발** | 의뢰서 작성 → 이력 조회 (TEST_PLAN 10장 케이스로 검증) | 신규 개발 |
| **7. 정리** | B-08, B-19, B-20, B-22, B-23, B-25, B-26, B-27 | 유지보수 |
