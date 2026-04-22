import { en_US } from './dictionaries/en_US'

export const LOCALES: string[] = ['en', 'ko'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

declare module 'i18next' {
  interface CustonTypeOptions {
    defaultNS: 'translation'
    resource: {
      translation: typeof en_US
    }
    returnNull: false
    lng: Locale
  }

  interface i18n {
    language: Locale
    resolvedLanguage: Locale
  }
}

export const i18nextSettings = {
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
}

export const i18n = {
  defaultLocal: 'en',
  locales: LOCALES,
} as const

export type TranslationKeys = keyof typeof en_US
