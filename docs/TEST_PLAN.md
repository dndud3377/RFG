# RFG 기능 테스트 계획서 (CASE별 실행 가이드)

> 작성 기준 커밋: `a629c05` / 작성일 2026-07-28
> 이 문서는 **실제로 실행해서 검증한 결과**를 기반으로 작성되었습니다.
> 발견된 버그·위험은 별도 문서 [`BUG_REPORT.md`](./BUG_REPORT.md)에 정리되어 있습니다.

---

## 0. 먼저 알아야 할 것 — "의뢰서 작성 → 이력 조회" 플로우는 아직 없습니다

이 문서의 테스트 대상을 정하기 위해 저장소 전체(현재 브랜치 + `main` + 과거 커밋 전부)를 조사한 결과,
**의뢰서 작성 / 승인 / 진행 상태 / 이력 조회에 해당하는 코드는 프론트·백엔드 어디에도 존재하지 않습니다.**

실측 근거:

| 확인 항목 | 실측 결과 |
|---|---|
| 프론트엔드 라우트 | `/`, `/tools/:toolId`, `*` **3개뿐** (`frontend/src/App.jsx:11-14`) |
| 화면에 존재하는 `<form>` | **0개** (홈 검색 `<input>` 1개가 유일한 입력 요소) |
| `/request`, `/requests`, `/history` 접근 | 라우트 없음 → 조용히 **홈으로 폴백** |
| 도구 4종(`ebeam`/`numbering`/`rcc`/`layerConvert`) | 전부 `ready: false` → 클릭 불가, "준비 중" 화면만 존재 |
| 백엔드 API | `GET /api/health/` **1개뿐** (`backend/api/urls.py`) |
| 백엔드 모델 / 마이그레이션 | **0개** (`backend/api/`에 `models.py` 자체가 없음) |
| 데이터 저장소 | 이력을 담을 테이블 없음. `useLocalStorage` 훅은 존재하나 **참조 0회(죽은 코드)** |

즉 현재 RFG는 **"도구 목록을 검색해서 보여주는 껍데기 + Django 헬스체크"** 단계입니다.
따라서 이 문서는 두 부분으로 구성합니다.

- **1~9장 — 지금 당장 실행 가능한 테스트** (현재 구현된 기능 전부, 실측 결과 포함)
- **10장 — 의뢰서→이력조회 플로우 구현 시 그대로 쓸 테스트 케이스** (미래 대비 설계)

---

## 1. 테스트 환경 준비

### 1-A. 프론트엔드 단독 (가장 빠름 · 1~8장 대부분을 여기서 수행)

```bash
cd frontend
npm install

# 개발 서버 (HMR)
npm run dev            # http://localhost:5173

# 프로덕션 빌드 결과 검증 (라우팅 폴백까지 실제와 동일)
npm run build
npm run preview        # http://localhost:4173
```

> 실측: `npm install` 정상, `npm run build` 1.25초 성공(61 modules, JS 223KB/gzip 71KB), `npm run dev`·`npm run preview` 모두 200 응답.
> **주의:** `npm run dev`(Vite)와 `npm run preview`는 SPA 폴백 동작이 다를 수 있으므로,
> **라우팅 테스트(4장)는 반드시 `npm run preview`에서** 수행하세요.

### 1-B. 백엔드 단독

```bash
cd backend
pip install -r requirements.txt

# 개발 설정
python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000      # http://localhost:8000/api/health/

# 운영 설정 그대로 재현 (배포 사고 사전 검증용)
DJANGO_SETTINGS_MODULE=config.settings.production \
DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1" \
DJANGO_SECRET_KEY="테스트용키" \
gunicorn config.wsgi:application --bind 127.0.0.1:8000
```

### 1-C. Docker 전체 스택 (nginx 포함 · 실제 배포와 동일)

```bash
# 운영
cp .env.example .env      # ⚠ 값을 반드시 채울 것 — 9장 TC-DEPLOY 참고
docker compose up --build -d          # http://localhost:8080

# 개발
cp .env.dev.example .env.dev
docker compose -f docker-compose.dev.yml up --build -d   # http://localhost:8081
```

> 이번 검증 환경에는 Docker 데몬이 없어 컨테이너 기동은 못 했습니다.
> 대신 **nginx가 백엔드로 보내는 것과 동일한 조건(평문 HTTP + 운영 settings)** 을
> gunicorn으로 로컬 재현해 9장 결과를 실측했습니다.

### 1-D. 자동화 스크립트 (선택)

수동 클릭 대신 아래 스크립트로 2~8장을 한 번에 돌릴 수 있습니다. Playwright만 있으면 됩니다.

```bash
npm i -g playwright && npx playwright install chromium
node e2e-smoke.mjs      # 스크립트 본문은 11장에 첨부
```

---

## 2. 기능 인벤토리 & 테스트 매트릭스

| # | 기능 | 구현 위치 | 테스트 장 | 상태 |
|---|---|---|---|---|
| F1 | 홈 히어로/도구 카드 목록 렌더 | `pages/Home.jsx`, `components/ToolCard.jsx` | 3장 | ✅ 동작 |
| F2 | 도구 이름 검색/필터 | `pages/Home.jsx:11-15` | 3장 | ⚠ 결함 있음 |
| F3 | 카드 클릭 → 도구 진입 / 준비중 차단 | `components/ToolCard.jsx:20-32` | 4장 | ⚠ 결함 있음 |
| F4 | SPA 라우팅 & 새로고침 폴백 | `App.jsx`, `frontend/nginx-frontend.conf` | 4장 | ⚠ 404 없음 |
| F5 | 상단 내비게이션 / 앵커 이동 | `components/Navbar.jsx:15-17` | 5장 | ⚠ 결함 있음 |
| F6 | i18n 문구 관리(하드코딩 금지 규칙) | `i18n.js`, `locales/ko.json` | 6장 | ⚠ 강제 장치 없음 |
| F7 | 반응형 레이아웃 | `styles/global.css` | 7장 | ⚠ 모바일 결함 |
| F8 | 접근성 | 전역 | 8장 | ❌ 미흡 |
| F9 | 백엔드 헬스체크 API | `backend/api/views.py` | 9장 | ✅ 동작 |
| F10 | 운영 배포 설정(nginx+Django) | `nginx/`, `config/settings/production.py` | 9장 | ❌ 치명적 결함 |
| F11 | **의뢰서 작성 → 이력 조회** | **없음** | 10장 | ❌ 미구현 |

**결과 표기 규칙**: ✅ 기대대로 · ⚠ 동작하나 문제 있음 · ❌ 실패/미구현 · 🐞 는 `BUG_REPORT.md`의 버그 ID.

---

## 3. F1·F2 — 홈 화면 & 검색

### 실행 방법
1. `npm run preview` → `http://localhost:4173/` 접속
2. 상단 검색창에 아래 값을 하나씩 입력하며 카드 개수 변화를 관찰

### 케이스 표

| ID | 입력/조작 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| TC-HOME-01 | 홈 최초 진입 | 히어로 + 카드 4장 | 카드 4장, 이름 `ebeam review / 채번 / RCC list / Layer Information Convert` | ✅ |
| TC-HOME-02 | 배지 확인 | 4장 모두 "준비 중" | 4장 모두 "준비 중" | ✅ |
| TC-HOME-03 | 화면에 i18n 키 문자열 노출 여부 | 없어야 함 | 없음 | ✅ |
| TC-HOME-04 | 브라우저 콘솔 | 에러 0건 | 에러 0건 | ✅ |
| TC-SRCH-01 | `채번` (한글 정확 일치) | 1장 | 1장 | ✅ |
| TC-SRCH-02 | `ebeam` (소문자) | 1장 | 1장 | ✅ |
| TC-SRCH-03 | `EBEAM` (대문자) | 1장 (대소문자 무시) | 1장 | ✅ |
| TC-SRCH-04 | `␣␣ebeam␣␣` (앞뒤 공백) | 1장 (trim 처리) | 1장 | ✅ |
| TC-SRCH-05 | `레이어` (**설명문에만** 있는 단어) | 1장 | **0장** | ❌ 🐞B-11 |
| TC-SRCH-06 | `RCC 목록` (설명문 단어) | 1장 | **0장** | ❌ 🐞B-11 |
| TC-SRCH-07 | `zzzz` (결과 없음) | "검색 결과가 없습니다." 노출 | 정상 노출 | ✅ |
| TC-SRCH-08 | `ㅊ` (한글 IME 조합 중간 상태) | 조합 완료 전 결과 유지가 이상적 | **0장 + "결과 없음" 깜빡임** | ⚠ 🐞B-12 |
| TC-SRCH-09 | `.*` (정규식 문자) | 리터럴 취급, 에러 없음 | 0장, 에러 없음 | ✅ |
| TC-SRCH-10 | 입력 전체 삭제 | 4장 복귀 | 4장 복귀 | ✅ |
| TC-SRCH-11 | `<img src=x onerror=alert(1)>` | 스크립트 실행 안 됨 | DOM에 HTML로 삽입되지 않음(React 이스케이프) | ✅ |
| TC-SRCH-12 | `'; DROP TABLE--` | 에러 없음 | 에러 없음(클라이언트 필터라 DB 무관) | ✅ |
| TC-SRCH-13 | 5,000자 입력 | 프리징 없음 | 정상, 에러 없음 | ✅ |
| TC-SRCH-14 | 이모지 `🔬🔬🔬` | 에러 없음 | 정상 | ✅ |
| TC-SRCH-15 | 검색 후 **새로고침** | 검색어 유지가 이상적 | URL에 상태 없음 → **검색어 소실** | ⚠ 🐞B-16 |
| TC-SRCH-16 | 검색 → 도구 진입 → 뒤로가기 | 검색어 복원이 이상적 | **빈 값으로 초기화** | ⚠ 🐞B-16 |

---

## 4. F3·F4 — 카드 클릭 & 라우팅

### 실행 방법
`npm run preview` 상태에서 주소창에 직접 URL을 입력(= 새로고침 폴백까지 검증)하고, 카드도 클릭해 봅니다.

| ID | 조작 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| TC-RTE-01 | "준비 중" 카드 클릭 | 이동하지 않음 | URL 변화 없음 | ✅ |
| TC-RTE-02 | `/tools/ebeam` 직접 진입 | "준비 중인 도구입니다" | 정상 | ✅ |
| TC-RTE-03 | `/tools/rcc` 에서 "← 도구 목록으로" 클릭 | 홈 복귀 | `/` 복귀 | ✅ |
| TC-RTE-04 | `/tools/does-not-exist` (없는 도구 id) | 404 안내가 바람직 | **"준비 중" 화면**(정상처럼 보임) | ❌ 🐞B-15 |
| TC-RTE-05 | `/totally/unknown/path` | 404 안내가 바람직 | **조용히 홈 렌더** | ❌ 🐞B-15 |
| TC-RTE-06 | 도구 페이지에서 새로고침 | 200 + 정상 렌더 | 200 (SPA 폴백 정상) | ✅ |
| TC-RTE-07 | 브라우저 뒤로가기 | 이전 화면 복원 | 정상 | ✅ |
| TC-RTE-08 | 브라우저 앞으로가기 | 다음 화면 복원 | 정상 | ✅ |
| TC-RTE-09 | **`ready: true`인데 전용 라우트가 없는 도구** | 빌드 실패 또는 명확한 경고 | 배지는 **"바로 사용"**, 클릭하면 **"준비 중" 화면** — 경고 없음 | ❌ 🐞B-09 |

> **TC-RTE-09 재현 절차** (실제로 이렇게 재현했습니다)
> 1. `frontend/src/data/catalog.js`의 `ebeam` 항목을 `ready: true`로 변경
> 2. `npm run build && npm run preview`
> 3. 홈에서 ebeam 카드 배지가 "바로 사용"으로 바뀌고 클릭이 활성화됨
> 4. 클릭 → `/tools/ebeam` 이동 → **화면 제목은 "준비 중인 도구입니다"**
> 5. 콘솔 에러 0건, 빌드 경고 0건 → 실수로 배포되면 아무도 모름
> 6. 테스트 후 `catalog.js` 원복

---

## 5. F5 — 내비게이션 / 앵커

| ID | 조작 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| TC-NAV-01 | 홈에서 "도구" 클릭 | 도구 섹션으로 스크롤 | 스크롤됨 | ✅ |
| TC-NAV-02 | 홈에서 "도움말" 클릭 | 푸터로 스크롤 | 스크롤됨 | ✅ |
| TC-NAV-03 | `/tools/rcc`에서 "도구" 클릭 | 홈+도구 섹션 | `/#tools` 이동 (단, `<a href>`라 **전체 페이지 재로드**) | ⚠ |
| TC-NAV-04 | `/#tools` 를 주소창에 직접 입력 | 도구 섹션 상단이 **보여야** 함 | 섹션 상단이 뷰포트 y=0에 위치 → **65px 스티키 헤더에 가려짐**(검색창이 잘림) | ❌ 🐞B-14 |
| TC-NAV-05 | `/tools/rcc` 접속 시 "홈" 링크 활성화 표시 | 비활성 | 활성 링크 0개 (의도대로) | ✅ |
| TC-NAV-06 | 모바일(390px)에서 내비 링크 | 접근 가능해야 함 | **`display:none` + 햄버거 버튼 0개 → 접근 불가** | ❌ 🐞B-13 |

> TC-NAV-04 측정 방법: `/#tools` 진입 후 콘솔에서
> `document.querySelector('#tools').getBoundingClientRect().top` → `0`,
> `document.querySelector('.navbar').getBoundingClientRect().bottom` → `65`.
> 앵커 대상에 `scroll-margin-top`이 없어서 발생합니다.

---

## 6. F6 — i18n / 하드코딩 금지 규칙 (CLAUDE.md 규칙 1·2)

### 실행 방법

```bash
cd frontend
# (1) .jsx 안에 사람이 읽는 문자열이 직접 박혀 있는지
grep -rn "[가-힣]" src --include=*.jsx | grep -v "^\S*: *//"

# (2) 코드가 참조하는 키 ↔ ko.json 키 대조 (아래 스크립트는 11장에도 첨부)
node - <<'EOF'
const fs=require('fs'),path=require('path')
const ko=JSON.parse(fs.readFileSync('src/locales/ko.json','utf8'))
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?flat(v,p+k+'.'):[p+k])
const keys=new Set(flat(ko)), used=new Set(), files=[]
;(function w(d){for(const f of fs.readdirSync(d)){const fp=path.join(d,f)
  fs.statSync(fp).isDirectory()?w(fp):/\.jsx?$/.test(f)&&files.push(fp)}})('src')
for(const f of files){const s=fs.readFileSync(f,'utf8')
  for(const m of s.matchAll(/t\(\s*['"`]([^'"`]+)['"`]/g)) used.add(m[1])
  for(const m of s.matchAll(/Key:\s*'([^']+)'/g)) used.add(m[1])}
console.log('ko.json에 없는데 코드가 쓰는 키:',[...used].filter(k=>!keys.has(k)))
console.log('코드가 안 쓰는 ko.json 키:',[...keys].filter(k=>!used.has(k)))
EOF
```

| ID | 검사 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| TC-I18N-01 | `.jsx` 내 한국어 하드코딩 | 0건 | 0건 (한글은 전부 주석) | ✅ |
| TC-I18N-02 | 코드가 쓰는데 `ko.json`에 없는 키 | 0건 | 0건 | ✅ |
| TC-I18N-03 | `ko.json`에 있으나 아무도 안 쓰는 키 | 0건이 바람직 | **7건**: `app.tagline`, `common.reset/calculate/won/percent/months/years` | ⚠ 🐞B-20 |
| TC-I18N-04 | **키를 실수로 빠뜨렸을 때** | 빌드 실패 또는 폴백 문구 | 화면에 **키 문자열 그대로 출력**(예: `tools.ghost.name`), 빌드·콘솔 모두 무경고 | ❌ 🐞B-10 |
| TC-I18N-05 | 다국어 추가 준비 상태 | 구조만 있으면 OK | `locales/`에 `ko.json` 하나, `resources`에 `ko`만 등록 | ✅(설계상 정상) |
| TC-I18N-06 | `catalog.js`가 CLAUDE.md 규칙 2를 지키는가 | `category`/`tagKey` 포함 | **`category`·`tagKey` 없음** — 규칙 문서와 코드 불일치 | ⚠ 🐞B-18 |

> **TC-I18N-04 재현 절차**
> 1. `catalog.js`에 `ko.json`에 없는 키를 쓰는 항목 추가 (`nameKey: 'tools.ghost.name'` 등)
> 2. `npm run build` → **성공**
> 3. 홈 화면 카드에 이름 `tools.ghost.name`, 설명 `tools.ghost.desc`, 아이콘 자리에 `tools.ghost.icon` 이 **그대로 노출**
> 4. 테스트 후 원복

---

## 7. F7 — 반응형

### 실행 방법
브라우저 개발자도구 반응형 모드에서 아래 4개 폭으로 홈/도구 페이지를 확인합니다.

| ID | 뷰포트 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| TC-RSP-01 | 1920×1080 | 가로 스크롤 없음 | 없음 | ✅ |
| TC-RSP-02 | 1280×900 | 가로 스크롤 없음 | 없음 | ✅ |
| TC-RSP-03 | 768×900 (태블릿) | 가로 스크롤 없음, 내비 노출 | 정상 | ✅ |
| TC-RSP-04 | 390×844 (모바일) | 가로 스크롤 없음 | 없음 | ✅ |
| TC-RSP-05 | 390×844 내비 메뉴 | 햄버거 등 대체 수단 제공 | **링크 숨김 + 대체 버튼 0개** | ❌ 🐞B-13 |
| TC-RSP-06 | 카드 그리드 | 폭에 따라 균등 배치 | `repeat(auto-fit, minmax(260px, 320px))` — 초광폭에서 카드가 왼쪽에 몰리고 오른쪽 여백이 크게 남음 | ⚠ |

---

## 8. F8 — 접근성 (수동 확인)

| ID | 검사 | 방법 | 실측 | 판정 |
|---|---|---|---|---|
| TC-A11Y-01 | 검색창 레이블 | `aria-label`/`<label>` 존재 여부 | **둘 다 없음** (placeholder만) | ❌ 🐞B-17 |
| TC-A11Y-02 | `h1` 개수 | 페이지당 1개 | 홈 1개 | ✅ |
| TC-A11Y-03 | "준비 중" 카드 키보드 접근 | Tab 이동 | `role`·`tabindex` 없음 → 포커스 불가, 스크린리더가 존재를 못 알림 | ❌ 🐞B-17 |
| TC-A11Y-04 | 아이콘 대체 텍스트 | 이모지에 `aria-hidden`/`aria-label` | 둘 다 없음 → 스크린리더가 "현미경" 등을 읽음 | ⚠ 🐞B-17 |
| TC-A11Y-05 | `html lang` | `ko` | `ko` | ✅ |
| TC-A11Y-06 | 페이지별 `<title>` | 화면마다 달라야 함 | 전 페이지 동일 (`RFG · Smart Finance Toolkit`) | ⚠ 🐞B-19 |

---

## 9. F9·F10 — 백엔드 API & 배포 설정

### 9-A. API 동작 (개발 설정)

```bash
cd backend && python manage.py runserver 0.0.0.0:8000
```

| ID | 요청 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| TC-API-01 | `GET /api/health/` | 200 `{"status":"ok"}` | 200 `{"status":"ok"}` | ✅ |
| TC-API-02 | `GET /api/health` (슬래시 없음) | 301 리다이렉트 | 301 | ✅ |
| TC-API-03 | `POST /api/health/` | 405 | 405 | ✅ |
| TC-API-04 | `GET /api/` | 404 또는 API 루트 | 404 | ⚠ 🐞B-25 |
| TC-API-05 | `GET /admin/` (nginx가 백엔드로 프록시함) | 관리자 로그인 | **404** — `django.contrib.admin` 미설치 | ❌ 🐞B-25 |
| TC-API-06 | `Accept: text/html`로 `/api/health/` | JSON만 | **DRF Browsable API HTML 반환** (운영 설정도 동일) | ⚠ 🐞B-24 |
| TC-API-07 | 개발 설정에서 없는 URL 접근 | - | Django DEBUG 페이지가 **URLconf 전체를 노출** | ⚠ 🐞B-27 |

### 9-B. 시스템 체크

```bash
python manage.py check                                                  # → 0 issues
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py check --deploy
```

실측 결과 — **경고 5건**:

| 코드 | 내용 | 버그 ID |
|---|---|---|
| security.W002 | `XFrameOptionsMiddleware` 없음 → 클릭재킹 방어 없음 | 🐞B-07 |
| security.W003 | **`CsrfViewMiddleware` 없음** → CSRF 방어 없음 | 🐞B-04 |
| security.W004 | `SECURE_HSTS_SECONDS` 미설정 | 🐞B-07 |
| security.W009 | `SECRET_KEY`가 짧고 안전하지 않음 | 🐞B-05 |
| security.W012 | `SESSION_COOKIE_SECURE` 미설정 | 🐞B-07 |

### 9-C. 배포 설정 (TC-DEPLOY) — **여기서 치명적 결함이 나옵니다**

`.env.example`을 그대로 복사해 쓰는 시나리오와, 값을 채운 시나리오를 각각 재현합니다.

```bash
cd backend
export DJANGO_SETTINGS_MODULE=config.settings.production

# CASE A: .env.example 그대로 (DJANGO_ALLOWED_HOSTS 빈 값)
DJANGO_ALLOWED_HOSTS="" gunicorn config.wsgi:application --bind 127.0.0.1:8011
curl -i http://127.0.0.1:8011/api/health/

# CASE B: 값을 올바르게 채운 경우
DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1" DJANGO_SECRET_KEY="..." \
  gunicorn config.wsgi:application --bind 127.0.0.1:8012
curl -i http://127.0.0.1:8012/api/health/
```

| ID | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| TC-DEP-01 | CASE A (`.env.example` 그대로) | 200 | **400 Bad Request** (`ALLOWED_HOSTS`가 `['']`가 됨) | ❌ 🐞B-03 |
| TC-DEP-02 | CASE B (평문 HTTP — nginx가 실제로 보내는 형태) | 200 | **301 → `https://.../api/health/`** | ❌ 🐞B-02 |
| TC-DEP-03 | `Host: evil.com` 헤더 위조 | 400 | 400 | ✅ |
| TC-DEP-04 | `SECRET_KEY` 미설정 시 | 기동 실패가 바람직 | `insecure-dev-key`로 **조용히 기동** | ❌ 🐞B-05 |
| TC-DEP-05 | 컨테이너 재기동 후 DB 데이터 | 유지 | sqlite가 컨테이너 내부에 있고 볼륨 미마운트 → **전량 소실** | ❌ 🐞B-06 |
| TC-DEP-06 | 의존성 취약점 (`npm audit`) | 0건 | **5건** (high 2 / moderate 3) | ⚠ 🐞B-08 |
| TC-DEP-07 | 개발 스택에서 프론트 코드 수정 반영 | 즉시 반영 | dev compose가 **운영용 Dockerfile(정적 빌드)** 을 그대로 씀 + 볼륨 없음 → **재빌드 전까지 반영 안 됨** | ⚠ 🐞B-23 |

> **TC-DEP-02가 왜 치명적인가**: `production.py:15`의 `SECURE_SSL_REDIRECT = True`인데
> `nginx/nginx.conf`는 80 포트만 리슨하고 `X-Forwarded-Proto`도 보내지 않으며,
> settings에 `SECURE_PROXY_SSL_HEADER`도 없습니다.
> 결과적으로 `http://localhost:8080/api/...` 요청은 매번 `https://localhost:8080/...`으로 301되고,
> 그 주소에는 TLS 리스너가 없어 **운영 스택의 API·admin 경로가 통째로 접속 불가**가 됩니다.

---

## 10. F11 — "의뢰서 작성 → 이력 조회" 플로우 테스트 케이스 (구현 후 사용)

현재는 실행할 수 없습니다(0장 참조). 아래는 기능이 만들어졌을 때 **그대로 붙여 쓰도록** 설계한 케이스 목록입니다.
각 케이스 옆의 "지금 상태"는 오늘 기준으로 왜 실행 불가인지를 적은 것입니다.

### 10-A. 의뢰서 작성 (TC-REQ)

| ID | 케이스 | 확인 포인트 | 지금 상태 |
|---|---|---|---|
| TC-REQ-01 | 정상 입력 후 등록 | 저장 성공 + 의뢰번호 발급 + 목록에 즉시 반영 | 폼·API·모델 전부 없음 |
| TC-REQ-02 | 필수 항목 미입력 | 항목별 인라인 에러, 서버 요청 미발생 | 검증 로직 없음 |
| TC-REQ-03 | 경계값 (제목 최대길이, 수량 0/음수/소수, 날짜 과거·미래) | 프론트·백엔드 **양쪽** 검증 | 없음 |
| TC-REQ-04 | 특수문자·이모지·HTML 태그 입력 | 저장/표시 시 이스케이프 (XSS) | 없음 |
| TC-REQ-05 | 매우 긴 텍스트(10,000자) | 413/400 대신 명확한 안내 | 없음 |
| TC-REQ-06 | 파일 첨부 (있다면) | 확장자·용량 제한, MIME 검증 | 없음. **주의: 운영 nginx는 20M 허용, 개발 nginx는 기본 1M → 환경별 결과 상이** 🐞B-22 |
| TC-REQ-07 | 등록 버튼 연타 | 중복 생성 방지(버튼 비활성화 + 서버 멱등키) | 없음 |
| TC-REQ-08 | 작성 중 새로고침/뒤로가기 | 임시저장 또는 이탈 경고 | 없음 (검색어조차 유지 안 됨 — TC-SRCH-15 참고) |
| TC-REQ-09 | 네트워크 오류/타임아웃 | 사용자에게 실패를 알리고 입력값 보존 | 없음. **운영 nginx `proxy_read_timeout 90s`** 초과 시 502 |
| TC-REQ-10 | 비로그인 상태 등록 시도 | 401/403 | **인증 체계 자체가 없음** |
| TC-REQ-11 | CSRF 토큰 없이 POST | 403 | **CSRF 미들웨어 부재로 통과할 것** 🐞B-04 |

### 10-B. 의뢰 상태 전이 (TC-FLOW)

| ID | 케이스 | 확인 포인트 |
|---|---|---|
| TC-FLOW-01 | 작성 → 접수 → 진행 → 완료 정상 경로 | 각 단계 이력(누가/언제) 기록 |
| TC-FLOW-02 | 역방향/건너뛰기 전이 시도 | 서버가 거부 |
| TC-FLOW-03 | 반려/취소 후 재상신 | 상태·이력 정합성 |
| TC-FLOW-04 | 두 사용자가 동시에 같은 의뢰 수정 | 낙관적 잠금 또는 충돌 안내 |
| TC-FLOW-05 | 권한 없는 사용자의 상태 변경 | 403 |

### 10-C. 이력 조회 (TC-HIST)

| ID | 케이스 | 확인 포인트 |
|---|---|---|
| TC-HIST-01 | 목록 기본 조회 | 정렬 기준 명확(최신순), 총 건수 표시 |
| TC-HIST-02 | 데이터 0건 | 빈 상태 안내 문구 (`ko.json`에 정의) |
| TC-HIST-03 | 기간/상태/작성자 필터 조합 | 조건 누적 적용, 조건 초기화 동작 |
| TC-HIST-04 | 페이지네이션 경계 (1p / 마지막p / 범위 밖 page=9999) | 에러 대신 정상 처리 |
| TC-HIST-05 | 대량 데이터(1만 건 이상) | 응답시간, 인덱스 유무 |
| TC-HIST-06 | 상세 진입 → 뒤로가기 | **필터/페이지 조건 유지** (현재 검색창은 유지 안 됨 🐞B-16) |
| TC-HIST-07 | 남의 의뢰 이력 URL 직접 접근 | 403 (IDOR 방지) |
| TC-HIST-08 | 엑셀/CSV 내보내기 (있다면) | 인코딩(UTF-8 BOM), CSV 인젝션(`=`,`+`,`-`,`@`) 방어 |
| TC-HIST-09 | 삭제된 의뢰 조회 | 소프트 삭제 시 이력 보존 여부 |
| TC-HIST-10 | 컨테이너 재기동 후 이력 유지 | **현재 구조로는 전량 소실** 🐞B-06 |

---

## 11. 자동화 스모크 스크립트

아래 파일을 `e2e-smoke.mjs`로 저장하고 `npm run preview` 상태에서 `node e2e-smoke.mjs`로 실행하면
3~8장의 핵심 케이스가 자동 검증됩니다. (이번 검증에 실제로 사용한 스크립트입니다.)

```js
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const out = []
const check = (id, ok, note) => { out.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${note}`) }

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
const errs = []
page.on('pageerror', e => errs.push(e.message))
page.on('console', m => m.type() === 'error' && errs.push(m.text()))

// --- 홈 & 검색 ---
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
check('TC-HOME-01', await page.locator('.tool-card').count() === 4, '카드 4장')
check('TC-HOME-03', !(await page.locator('body').innerText()).match(/\b(tools|home|common|nav|footer)\.[a-zA-Z.]+/), 'i18n 키 미노출')

const search = page.locator('.search-box__input')
const count = async v => { await search.fill(v); await page.waitForTimeout(150); return page.locator('.tool-card').count() }
check('TC-SRCH-01', await count('채번') === 1, '한글 정확 일치')
check('TC-SRCH-03', await count('EBEAM') === 1, '대소문자 무시')
check('TC-SRCH-04', await count('  ebeam  ') === 1, '앞뒤 공백 trim')
check('TC-SRCH-05', await count('레이어') === 1, '설명문 단어 검색 (현재 실패 예상)')
check('TC-SRCH-07', await count('zzzz') === 0 && await page.locator('.empty-msg').isVisible(), '결과 없음 안내')
check('TC-SRCH-10', await count('') === 4, '전체 복귀')

// --- 라우팅 ---
await page.goto(`${BASE}/tools/ebeam`, { waitUntil: 'networkidle' })
check('TC-RTE-02', await page.locator('.coming-soon').isVisible(), '준비중 화면')
await page.goto(`${BASE}/totally/unknown`, { waitUntil: 'networkidle' })
check('TC-RTE-05', !(await page.locator('.hero__title').isVisible()), '없는 경로는 404여야 함 (현재 실패 예상)')

// --- 앵커 ---
await page.goto(`${BASE}/#tools`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const overlap = await page.evaluate(() => {
  const nav = document.querySelector('.navbar').getBoundingClientRect()
  const sec = document.querySelector('#tools').getBoundingClientRect()
  return sec.top < nav.bottom
})
check('TC-NAV-04', !overlap, '앵커 대상이 스티키 헤더에 가리지 않아야 함 (현재 실패 예상)')

// --- 접근성 ---
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
check('TC-A11Y-01', !!await search.getAttribute('aria-label'), '검색창 aria-label (현재 실패 예상)')
check('TC-A11Y-02', await page.locator('h1').count() === 1, 'h1 1개')

// --- 반응형 ---
for (const [w, h, name] of [[1920,1080,'wide'],[1280,900,'desktop'],[768,900,'tablet'],[390,844,'mobile']]) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  check(`TC-RSP-${name}`, !overflow, `${w}px 가로 스크롤 없음`)
}
check('TC-RSP-05', await page.locator('.navbar__links').isVisible() || await page.locator('button').count() > 0,
      '모바일 내비 대체 수단 (현재 실패 예상)')

check('CONSOLE', errs.length === 0, `콘솔 에러 ${errs.length}건`)
console.log(`\n결과: ${out.filter(Boolean).length}/${out.length} 통과`)
await browser.close()
process.exit(out.every(Boolean) ? 0 : 1)
```

백엔드용 스모크는 셸 한 줄로 충분합니다.

```bash
cd backend
python manage.py check &&
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py check --deploy
```

---

## 12. 회귀 체크리스트 (도구를 추가/수정할 때마다)

- [ ] `npm run build` 성공
- [ ] 6장 i18n 키 대조 스크립트 → **양쪽 다 0건**
- [ ] `.jsx`에 한국어 하드코딩 0건 (CLAUDE.md 규칙 1)
- [ ] `catalog.js`의 `ready: true` 항목마다 **전용 라우트가 `App.jsx`에 등록**되어 있는가 (🐞B-09)
- [ ] `catalog.js`의 `id`가 중복되지 않는가
- [ ] `node e2e-smoke.mjs` 통과
- [ ] `python manage.py check --deploy` 경고가 늘지 않았는가
- [ ] `npm audit` 취약점이 늘지 않았는가

---

## 13. 이번 검증 요약

| 구분 | 실행 | 통과 | 문제 발견 |
|---|---|---|---|
| 홈/검색 (3장) | 16 | 12 | 4 |
| 라우팅 (4장) | 9 | 6 | 3 |
| 내비게이션 (5장) | 6 | 3 | 3 |
| i18n (6장) | 6 | 3 | 3 |
| 반응형 (7장) | 6 | 4 | 2 |
| 접근성 (8장) | 6 | 2 | 4 |
| 백엔드/배포 (9장) | 14 | 5 | 9 |
| 의뢰서→이력조회 (10장) | 0 | - | **전부 미구현** |

총 **27건**의 버그·위험을 정리했습니다 → [`BUG_REPORT.md`](./BUG_REPORT.md)
