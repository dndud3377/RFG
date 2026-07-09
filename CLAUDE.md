# RFG 프로젝트 규칙

이 문서는 RFG 코드베이스의 **필수 규칙**입니다. 사람 기여자와 AI 코딩 에이전트 모두 이 규칙을 따라야 합니다.

---

## 🔒 규칙 1 — UI 문구는 절대 하드코딩하지 않는다

화면에 보이는 **모든 텍스트**(제목, 버튼, 라벨, 플레이스홀더, 에러 메시지, 안내 문구 등)는
**오직 [`src/locales/ko.json`](src/locales/ko.json) 한 곳에서만** 관리한다.

- 컴포넌트/페이지(`.jsx`) 안에 한국어(또는 어떤 언어든) 문자열을 직접 쓰지 않는다.
- 문구를 바꾸거나 추가할 때는 **`ko.json`만** 수정한다.
- 컴포넌트에서는 `react-i18next`의 `t('키.경로')`로 문구를 불러온다.

### ❌ 이렇게 하지 마세요 (하드코딩)

```jsx
<button>계산하기</button>
<h1>대출·이자 계산기</h1>
<p>값을 입력하면 결과가 표시됩니다.</p>
```

### ✅ 이렇게 하세요 (i18n)

```jsx
import { useTranslation } from 'react-i18next'

function Example() {
  const { t } = useTranslation()
  return (
    <>
      <button>{t('common.calculate')}</button>
      <h1>{t('loan.title')}</h1>
      <p>{t('loan.result.empty')}</p>
    </>
  )
}
```

그리고 문구는 `ko.json`에 정의한다:

```json
{
  "common": { "calculate": "계산하기" },
  "loan": {
    "title": "대출·이자 계산기",
    "result": { "empty": "값을 입력하면 결과가 표시됩니다." }
  }
}
```

> **예외:** 순수 기호/이모지(예: `✕`, `+`, `−`)나 숫자 포맷 등 언어에 종속되지 않는 값은 하드코딩해도 된다.
> 단, 실제 단어·문장은 반드시 `ko.json`으로 뺀다. (단위 "원 / % / 개월 / 년" 등도 `common`에 있음)

---

## 🔒 규칙 2 — 카테고리/도구 메타데이터도 문구를 직접 담지 않는다

카테고리와 도구 목록은 [`src/data/catalog.js`](src/data/catalog.js)에서 관리하되,
**표시 문구는 담지 않고 i18n 키(`nameKey`, `descKey`, `iconKey`, `tagKey`)만 참조**한다.

```js
// catalog.js — 문구가 아니라 '키'만 둔다
{ id: 'loan', category: 'calc', path: '/tools/loan', ready: true,
  iconKey: 'tools.loan.icon', nameKey: 'tools.loan.name', descKey: 'tools.loan.desc' }
```

---

## ➕ 새 도구를 추가하는 방법

1. `src/data/catalog.js`의 `tools` 배열에 항목 추가 (`id`, `category`, `path`, `ready`, `*Key` 지정)
2. `src/locales/ko.json`의 `tools.<id>`에 `name` / `desc` / `icon` 문구 추가
3. 실제 페이지가 필요하면 `src/pages/`에 컴포넌트를 만들고 `src/App.jsx`에 라우트 등록
4. 페이지 내부의 모든 문구도 **규칙 1**에 따라 `ko.json`에 추가

`ready: false`이면 홈에서 "준비 중" 배지로 표시되고 클릭이 비활성화된다.

---

## 🌐 다국어(언어 추가)

새 언어는 `src/locales/`에 `<lang>.json`을 추가하고 `src/i18n.js`의 `resources`에 등록한다.
`ko.json`의 키 구조를 그대로 복제해 값만 번역하면 된다. (문구가 한 곳에 모여 있어 번역이 쉽다.)

---

## ✅ 변경 전 체크리스트

- [ ] `.jsx`에 사람이 읽는 텍스트를 직접 넣지 않았는가? (모두 `t('...')` 사용)
- [ ] 새/변경 문구를 `ko.json`에 반영했는가?
- [ ] 카테고리/도구는 `catalog.js`에서 키만 참조하는가?
- [ ] `npm run build`가 성공하는가?
