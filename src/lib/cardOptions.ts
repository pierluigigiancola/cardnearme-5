import type { Condition, Finish, Language } from '#/services/types'

/** Option lists and labels for card attributes, shared by forms, badges and facets. The values come from the domain. */

export { conditions, finishes, isCondition, isFinish, isLanguage, languages } from '#/domain'

export const conditionLabels: Record<Condition, string> = {
  EX: 'Excellent',
  GD: 'Good',
  LP: 'Light played',
  M: 'Mint',
  NM: 'Near mint',
  PL: 'Played',
  PO: 'Poor',
}

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

export const finishLabels: Record<Finish, string> = {
  etched: 'Etched',
  foil: 'Foil',
  nonfoil: 'Non-foil',
}
