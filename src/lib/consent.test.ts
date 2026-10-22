import { describe, expect, it } from 'vitest'

import { applyConsent, readConsent, saveConsent } from './consent'
import type { AnalyticsClient } from './consent'

function fakeAnalytics() {
  const calls: string[] = []
  let loaded = false
  const client: AnalyticsClient = {
    isLoaded: () => loaded,
    load: () => {
      loaded = true
      calls.push('load')
    },
    optIn: () => calls.push('optIn'),
    optOut: () => calls.push('optOut'),
  }
  return {
    calls,
    client,
  }
}

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

describe('analytics consent', () => {
  it('loads nothing while the visitor has not chosen', () => {
    const { calls, client } = fakeAnalytics()
    applyConsent(null, client)
    expect(calls).toEqual([])
  })

  it('loads nothing when the visitor declines', () => {
    const { calls, client } = fakeAnalytics()
    applyConsent('declined', client)
    expect(calls).toEqual([])
  })

  it('loads analytics once the visitor accepts', () => {
    const { calls, client } = fakeAnalytics()
    applyConsent('accepted', client)
    expect(calls).toEqual(['load'])
  })

  it('stops capturing when the visitor later declines', () => {
    const { calls, client } = fakeAnalytics()
    applyConsent('accepted', client)
    applyConsent('declined', client)
    expect(calls).toEqual(['load', 'optOut'])
  })

  it('resumes capturing without loading twice when the visitor accepts again', () => {
    const { calls, client } = fakeAnalytics()
    applyConsent('accepted', client)
    applyConsent('declined', client)
    applyConsent('accepted', client)
    expect(calls).toEqual(['load', 'optOut', 'optIn'])
  })
})

describe('stored consent', () => {
  it('is unset on a first visit', () => {
    expect(readConsent(memoryStorage())).toBeNull()
  })

  it('remembers the choice for the next visit', () => {
    const storage = memoryStorage()
    saveConsent(storage, 'declined')
    expect(readConsent(storage)).toBe('declined')
    saveConsent(storage, 'accepted')
    expect(readConsent(storage)).toBe('accepted')
  })

  it('treats an unrecognised stored value as unset', () => {
    const storage = memoryStorage()
    storage.setItem('cnm-analytics-consent', 'maybe')
    expect(readConsent(storage)).toBeNull()
  })

  it('is unset when storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => saveConsent(broken, 'accepted')).not.toThrow()
    expect(readConsent(broken)).toBeNull()
    expect(readConsent(undefined)).toBeNull()
  })
})
