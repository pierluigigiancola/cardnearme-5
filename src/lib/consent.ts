/**
 * Analytics consent: whether the visitor allowed analytics to run.
 * `null` means they haven't chosen yet, which is treated as declined.
 */
export type ConsentChoice = 'accepted' | 'declined'

/** The analytics library as consent sees it, so PostHog stays behind a seam. */
export interface AnalyticsClient {
  isLoaded: () => boolean
  load: () => void
  optIn: () => void
  optOut: () => void
}

export function applyConsent(choice: ConsentChoice | null, client: AnalyticsClient) {
  if (choice === 'accepted') {
    if (client.isLoaded()) client.optIn()
    else client.load()
  }
  else if (client.isLoaded()) {
    client.optOut()
  }
}

const STORAGE_KEY = 'cnm-analytics-consent'

type ConsentStorage = Pick<Storage, 'getItem' | 'setItem'>

/** The stored choice, or `null` if none (or storage is unavailable). */
export function readConsent(storage: ConsentStorage | undefined): ConsentChoice | null {
  try {
    const value = storage?.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  }
  catch {
    return null
  }
}

export function saveConsent(storage: ConsentStorage | undefined, choice: ConsentChoice) {
  try {
    storage?.setItem(STORAGE_KEY, choice)
  }
  catch {
    // Storage can be unavailable (private mode); the choice holds for this visit.
  }
}
