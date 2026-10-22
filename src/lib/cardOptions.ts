import type { Condition, Finish, Language } from '#/services/types'

/** Option lists and labels for card attributes, shared by forms, badges and facets. */

export const conditions: Condition[] = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO']

export const conditionLabels: Record<Condition, string> = {
  EX: 'Excellent',
  GD: 'Good',
  LP: 'Light played',
  M: 'Mint',
  NM: 'Near mint',
  PL: 'Played',
  PO: 'Poor',
}

export const languages: Language[] = ['en', 'it', 'de', 'fr', 'es', 'ja', 'pt', 'ko', 'zh']

export const languageLabels: Record<Language, string> = {
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  zh: 'Chinese',
}

export const finishes: Finish[] = ['nonfoil', 'foil', 'etched']

export const finishLabels: Record<Finish, string> = {
  etched: 'Etched',
  foil: 'Foil',
  nonfoil: 'Non-foil',
}

/** True when `condition` is at least as good as `minimum` (M is best, PO worst). */
export function meetsCondition(condition: Condition, minimum: Condition) {
  return conditions.indexOf(condition) <= conditions.indexOf(minimum)
}

export function isCondition(value: unknown): value is Condition {
  return conditions.some(condition => condition === value)
}

export function isLanguage(value: unknown): value is Language {
  return languages.some(language => language === value)
}

export function isFinish(value: unknown): value is Finish {
  return finishes.some(finish => finish === value)
}
