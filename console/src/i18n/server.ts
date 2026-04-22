import { en_US } from './dictionaries/en_US'
import { ko_KR } from './dictionaries/ko_KR'
import { type Locale } from './settings'

const dictionaries: Record<Locale, typeof en_US | typeof ko_KR> = {
  en: en_US,
  ko: ko_KR,
}

export const getDictionary = (locale: Locale): typeof en_US | typeof ko_KR => dictionaries[locale]
