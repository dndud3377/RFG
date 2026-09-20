# RFG · Engineering Toolkit Portal

**서로 다른 목적과 기능을 가진 사내 업무 도구들을 각각 별도로 만들어 배포하는 대신, 하나의 웹사이트에서 통합 관리·제공하기 위한 플랫폼**입니다.
새 도구가 필요할 때마다 새 프로그램/사이트를 따로 만드는 게 아니라, 이 사이트 안에 도구를 하나씩 추가해 나가면서 로그인(SSO)·문구 관리·배포 방식을 공유합니다. 밝은 파란 톤의 볼드·다이나믹한 디자인을 지향합니다.

## 컨셉

- **플랫폼 하나, 도구 여러 개** — 계산기, 조회 도구, 변환 도구처럼 서로 성격이 전혀 다른 프로그램이라도 이 사이트의 카탈로그(`frontend/src/data/catalog.js`)에 항목만 추가하면 같은 홈 화면·같은 로그인·같은 디자인 시스템 위에서 서비스됩니다.
- **공통 인프라 재사용** — 로그인(사내 ADFS SSO), 메일 발송, 문구(i18n) 관리, 레이아웃/디자인을 도구마다 새로 만들지 않고 플랫폼이 한 번에 제공합니다. 도구 개발자는 실제 기능(페이지) 구현에만 집중하면 됩니다.
- **점진적 확장** — 아직 구현되지 않은 도구는 카탈로그에 `ready: false`로 등록해 홈 화면에 "준비 중" 배지로 먼저 노출하고, 개발이 끝나면 실제 페이지를 붙여 `ready: true`로 전환합니다.

## 현재 등록된 도구

카탈로그(`frontend/src/data/catalog.js`)에 등록되어 있으며, 아직 모두 페이지 구현 전이라 홈에서는 **준비 중** 배지로 표시되고 클릭 시 안내 페이지(`ComingSoon`)로 이동합니다.

| 도구 | 설명 |
|------|------|
| 🔬 ebeam review | 이빔(E-beam) 리뷰 결과 확인·관리 |
| 🔢 채번(numbering) | 도면·문서 번호를 규칙에 따라 자동 부여 |
| 📋 RCC list | RCC 목록 조회·관리 |
| 🗂️ Layer Information Convert | 레이어 정보를 원하는 형식으로 변환 |

> 도구 목록과 문구는 계속 추가/변경될 수 있습니다. 최신 목록은 `frontend/src/data/catalog.js`와 `frontend/src/locales/ko.json`의 `tools` 항목을 확인하세요.

## 로그인 (사내 SSO)

- 운영 환경은 **사내 ADFS 계정으로 로그인(OIDC SSO)**합니다. 같은 ADFS를 사용하는 기존 사내 시스템(`request-site`)과 계정을 공유하므로, 브라우저에 해당 시스템의 ADFS 세션이 남아 있으면 재로그인 없이 바로 인증됩니다.
- 로컬 개발 환경(`AUTH_MODE=dev`)에서는 ADFS 없이 개발용 로그인으로 대체할 수 있습니다.
- 메일 발송도 `request-site`와 동일한 DXHUB 게이트웨이 인프라(`backend/api/mailer.py`)를 재사용합니다.

## 하드코딩 없는 문구 관리

모든 UI 텍스트는 [`frontend/src/locales/ko.json`](frontend/src/locales/ko.json) 한 곳에 모아 `react-i18next`로 관리합니다. 언어 추가도 여기서 확장합니다. 자세한 규칙은 [`CLAUDE.md`](CLAUDE.md) 참고.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18 + Vite, react-router-dom, react-i18next |
| Backend | Django 4.2 + Django REST Framework, ADFS OIDC 연동, JWT(쿠키) 인증 |
| Server | Nginx (프론트/백엔드 리버스 프록시) |
| Container | Docker + Docker Compose |

## 환경 구성

운영과 개발을 분리하여 운영합니다.

| 항목 | 운영 | 개발 |
|------|------|------|
| 실행 명령 | `docker compose up --build` | `docker compose -f docker-compose.dev.yml up --build` |
| 포트 | 8080 | 8081 |
| Django 설정 | `config.settings.production` | `config.settings.development` |
| 로그인 방식 | ADFS SSO (`AUTH_MODE=sso`) | 개발용 로그인 (`AUTH_MODE=dev`) |

## 프로젝트 구조

```
RFG/
├── docker-compose.yml          # 운영 환경
├── docker-compose.dev.yml      # 개발 환경
├── .env.example                # 운영 환경변수 템플릿
├── .env.dev.example            # 개발 환경변수 템플릿
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py         # 공통 설정 (ADFS OIDC, JWT, 메일 등)
│   │   │   ├── production.py   # 운영 전용 (AUTH_MODE=sso 기본)
│   │   │   └── development.py  # 개발 전용 (AUTH_MODE=dev 기본)
│   │   └── urls.py
│   └── api/                    # 인증(OIDC/SSO), 사용자, 메일 발송 등
│
├── frontend/
│   ├── index.html / vite.config.js / package.json
│   └── src/
│       ├── locales/ko.json     # 모든 UI 문구 (단일 소스)
│       ├── data/catalog.js     # 도구 카탈로그 — 새 도구는 여기 등록 (i18n 키만 참조)
│       ├── i18n.js             # i18next 초기화
│       ├── api/client.js       # 백엔드 API 클라이언트
│       ├── contexts/           # AuthContext (SSO 로그인 상태)
│       ├── components/         # Navbar, Footer, Layout, ToolCard
│       ├── pages/              # Home, Login, OIDCCallback, ComingSoon, (도구별 페이지)
│       ├── hooks/               # useLocalStorage, useIdleTimer
│       └── styles/global.css   # 디자인 시스템 (밝은 파란 톤)
│
└── nginx/
    ├── nginx.conf               # 운영 Nginx 설정
    └── nginx.dev.conf           # 개발 Nginx 설정
```

## 새 도구를 이 플랫폼에 추가하는 방법

1. `frontend/src/data/catalog.js`의 `tools` 배열에 항목 추가 (`id`, `path`, `ready`, `*Key` 지정)
2. `frontend/src/locales/ko.json`의 `tools.<id>`에 `name` / `desc` / `icon` 문구 추가
3. 실제 페이지가 준비되면 `frontend/src/pages/`에 컴포넌트를 만들고 `frontend/src/App.jsx`에 라우트 등록, `ready: true`로 변경
4. 페이지 내부의 모든 문구도 하드코딩 없이 `ko.json`에 추가 (자세한 내용은 [`CLAUDE.md`](CLAUDE.md))
5. 백엔드 API가 필요하면 `backend/api/`에 엔드포인트 추가 — 로그인·인증은 플랫폼 공통 인프라(ADFS SSO)를 그대로 재사용

## 로컬 개발 (프론트엔드만)

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## 프로덕션 빌드

```bash
cd frontend
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 미리보기
```

## Docker 실행

```bash
# 운영
cp .env.example .env
docker compose up --build -d
# 브라우저에서 http://localhost:8080 접속

# 개발
cp .env.dev.example .env.dev
docker compose -f docker-compose.dev.yml up --build -d
# 브라우저에서 http://localhost:8081 접속
```

nginx가 `/api/`, `/admin/`은 backend로, 그 외 경로는 frontend로 라우팅하며, frontend 컨테이너 내부의 nginx가 SPA 라우팅을 위해 모든 경로를 `index.html`로 폴백합니다.

## 문구(텍스트) 수정 방법

화면 문구를 바꾸려면 컴포넌트가 아니라 `frontend/src/locales/ko.json`만 수정하면 됩니다. 새 도구를 추가할 때는 `frontend/src/data/catalog.js`에 항목을 등록하고, 대응하는 문구 키를 `ko.json`에 추가하세요.

> ⚠️ **하드코딩 금지 규칙**: UI 문구는 반드시 `ko.json` 한 곳에서만 관리합니다. 자세한 규칙과 예시는 [`CLAUDE.md`](CLAUDE.md)를 참고하세요.
