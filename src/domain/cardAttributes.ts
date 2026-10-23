import type { Condition, Finish, Language } from '#/services/types'

/** The valid values of a copy's condition, language and finish (labels live in `#/lib/cardOptions`). */

/** Conditions from best to worst. */
export const conditions: Condition[] = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO']

export const languages: Language[] = ['en', 'it', 'de', 'fr', 'es', 'ja', 'pt', 'ko', 'zh']

export const finishes: Finish[] = ['nonfoil', 'foil', 'etched']

export function isCondition(value: unknown): value is Condition {
  return conditions.some(condition => condition === value)
}

export function isLanguage(value: unknown): value is Language {
  return languages.some(language => language === value)
}

export function isFinish(value: unknown): value is Finish {
  return finishes.some(finish => finish === value)
}
