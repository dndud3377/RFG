import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ko from './locales/ko.json'

// 모든 UI 문구는 locales/*.json 에 모아 관리합니다. (하드코딩 금지)
// 언어를 추가하려면 resources 에 항목을 추가하면 됩니다. (예: en)
export const resources = {
  ko: { translation: ko },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ko',
  fallbackLng: 'ko',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
