export const PartTypes = {
  PLAIN: 'PLAIN',
  VALUE: 'VALUE',
  LYRICS: 'LYRICS',
  BIBLE: 'BIBLE',
} as const

export type PartType = (typeof PartTypes)[keyof typeof PartTypes]

export const AvailableBibleVersionsTypes = {
  ESV: 'ESV',
  KJV: 'KJV',
  NIV: 'NIV',
  NLT: 'NLT',
  GAE: '개역개정',
  RHV: '개역한글',
  SAENEW: '새번역',
  COGNEW: '공동번역',
  HDB: '현대인의 성경',
} as const

export type AvailableBibleVersion = (typeof AvailableBibleVersionsTypes)[keyof typeof AvailableBibleVersionsTypes]
