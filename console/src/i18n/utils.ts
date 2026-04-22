import i18next from 'i18next'

import { type Locale } from './settings'

export function getLocaleFromPath(): Locale {
  return i18next.language as Locale
}
