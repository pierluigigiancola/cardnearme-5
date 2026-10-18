import type { PricingSource } from '#/services/types'

const currencyBySource: Record<PricingSource, {
  currency: string;
  locale: string
}> = {
  'cardmarket-eur': {
    currency: 'EUR',
    locale: 'en-IE',
  },
  'tcgplayer-usd': {
    currency: 'USD',
    locale: 'en-US',
  },
}

export function formatPrice(amount: number | null | undefined, source: PricingSource = 'cardmarket-eur') {
  if (amount === null || amount === undefined) return '—'
  const { currency, locale } = currencyBySource[source]
  return new Intl.NumberFormat(locale, {
    currency,
    style: 'currency',
  }).format(amount)
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

export function formatRelative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  const formatter = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
    style: 'short',
  })
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return formatter.format(Math.round(diff / ms), unit)
  }
  return 'just now'
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}
