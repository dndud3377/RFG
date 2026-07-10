# RFG · Smart Finance Toolkit

금융 도구를 **카테고리별로 그룹핑**해 한 곳에서 제공하는 웹사이트입니다. 밝은 파란 톤의 볼드·다이나믹한 디자인을 지향합니다.

## 특징

- **카테고리 구조(그룹핑형) 홈** — 좌측 사이드바에서 카테고리를 선택하면 해당 그룹의 도구만 필터링됩니다.
- **하드코딩 없는 문구 관리** — 모든 UI 텍스트는 [`frontend/src/locales/ko.json`](frontend/src/locales/ko.json) 한 곳에 모아 `react-i18next`로 관리합니다. 언어 추가도 여기서 확장합니다.
- **동작하는 도구**
  - 🏦 **대출·이자 계산기** — 원리금 균등 / 원금 균등 / 만기 일시 상환 방식별 월 납입금·총 이자 계산
  - 📊 **예산·가계부** — 수입/지출 기록, 카테고리 분석, 브라우저(`localStorage`) 저장
  - 그 외 도구(환율·투자수익률·세금·저축목표·구독관리·리포트·알림)는 카탈로그에 등록된 **준비 중** 상태

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18 + Vite, react-router-dom, react-i18next |
| Backend | Django 4.2 + Django REST Framework (최소 스캐폴드) |
| Server | Nginx (프론트/백엔드 리버스 프록시) |
| Container | Docker + Docker Compose |

## 환경 구성

운영과 개발을 분리하여 운영합니다.

| 항목 | 운영 | 개발 |
|------|------|------|
| 실행 명령 | `docker compose up --build` | `docker compose -f docker-compose.dev.yml up --build` |
| 포트 | 8080 | 8081 |
| Django 설정 | `config.settings.production` | `config.settings.development` |

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
│   │   │   ├── base.py         # 공통 설정
│   │   │   ├── production.py   # 운영 전용
│   │   │   └── development.py  # 개발 전용
│   │   └── urls.py
│   └── api/                    # 헬스체크 등 최소 API
│
├── frontend/
│   ├── index.html / vite.config.js / package.json
│   └── src/
│       ├── locales/ko.json     # 모든 UI 문구 (단일 소스)
│       ├── data/catalog.js     # 카테고리·도구 메타데이터 (i18n 키만 참조)
│       ├── i18n.js             # i18next 초기화
│       ├── components/         # Navbar, Footer, Layout, ToolCard
│       ├── pages/               # Home, LoanCalculator, Budget, ComingSoon
│       ├── hooks/               # useLocalStorage
│       ├── utils/               # format, loan 계산 로직
│       └── styles/global.css   # 디자인 시스템 (밝은 파란 톤)
│
└── nginx/
    ├── nginx.conf               # 운영 Nginx 설정
    └── nginx.dev.conf           # 개발 Nginx 설정
```

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
