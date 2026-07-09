# RFG · Smart Finance Toolkit

금융 도구를 **카테고리별로 그룹핑**해 한 곳에서 제공하는 웹사이트입니다. 밝은 파란 톤의 볼드·다이나믹한 디자인을 지향합니다.

## 특징

- **카테고리 구조(그룹핑형) 홈** — 좌측 사이드바에서 카테고리를 선택하면 해당 그룹의 도구만 필터링됩니다.
- **하드코딩 없는 문구 관리** — 모든 UI 텍스트는 [`src/locales/ko.json`](src/locales/ko.json) 한 곳에 모아 `react-i18next`로 관리합니다. 언어 추가도 여기서 확장합니다.
- **동작하는 도구**
  - 🏦 **대출·이자 계산기** — 원리금 균등 / 원금 균등 / 만기 일시 상환 방식별 월 납입금·총 이자 계산
  - 📊 **예산·가계부** — 수입/지출 기록, 카테고리 분석, 브라우저(`localStorage`) 저장
  - 그 외 도구(환율·투자수익률·세금·저축목표·구독관리·리포트·알림)는 카탈로그에 등록된 **준비 중** 상태

## 기술 스택

- React 18 + Vite
- react-router-dom (SPA 라우팅)
- react-i18next (다국어/문구 관리)
- Docker + nginx (배포)

## 프로젝트 구조

```
src/
├─ locales/ko.json      # 모든 UI 문구 (단일 소스)
├─ data/catalog.js      # 카테고리·도구 메타데이터 (i18n 키만 참조)
├─ i18n.js              # i18next 초기화
├─ components/          # Navbar, Footer, Layout, ToolCard
├─ pages/               # Home, LoanCalculator, Budget, ComingSoon
├─ hooks/               # useLocalStorage
├─ utils/               # format, loan 계산 로직
└─ styles/global.css    # 디자인 시스템 (밝은 파란 톤)
```

## 로컬 개발

```bash
npm install
npm run dev      # http://localhost:5173
```

## 프로덕션 빌드

```bash
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 미리보기
```

## Docker 실행

```bash
# 이미지 빌드 & 실행
docker compose up --build -d

# 브라우저에서 http://localhost:8080 접속
```

컨테이너는 nginx로 정적 빌드를 서빙하며, SPA 라우팅을 위해 모든 경로를 `index.html`로 폴백합니다.

## 문구(텍스트) 수정 방법

화면 문구를 바꾸려면 컴포넌트가 아니라 `src/locales/ko.json`만 수정하면 됩니다. 새 도구를 추가할 때는 `src/data/catalog.js`에 항목을 등록하고, 대응하는 문구 키를 `ko.json`에 추가하세요.
