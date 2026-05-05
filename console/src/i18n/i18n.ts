import { initReactI18next } from 'react-i18next'
import i18next from 'i18next'
import ChainedBackend from 'i18next-chained-backend'
import HttpBackend from 'i18next-http-backend'
import LocalStorageBackend from 'i18next-localstorage-backend'

import { en_US } from './dictionaries/en_US'
import { ko_KR } from './dictionaries/ko_KR'

const resources = {
  en: {
    translation: en_US,
  },
  ko: {
    translation: ko_KR,
  },
}

void i18next
  .use(ChainedBackend)
  .use(initReactI18next)
  .init({
    resources,
    lng: typeof window !== 'undefined' ? window.localStorage.getItem('language') || 'en' : 'en',
    interpolation: { escapeValue: false },
    backend: {
      backends: [LocalStorageBackend, HttpBackend],
      backendOptions: [
        {
          expirationTime: 7 * 24 * 60 * 60 * 1000, // 1 week
          store: typeof window !== 'undefined' ? window.localStorage : null,
        },
      ],
    },
    keySeparator: false,
  })

export default i18next
