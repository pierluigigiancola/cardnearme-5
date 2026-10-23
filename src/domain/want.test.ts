import { describe, expect, it } from 'vitest'

import { fulfilsWant, fulfilWants } from './want'
import type { ReceivedCopy, WantTarget } from './want'

import type { WantFilters } from '#/services/types'

const anyPrinting: WantTarget = {
  cardId: 'mtg:shivan-dragon',
  filters: {
    finish: null,
    language: null,
    minCondition: null,
    setCode: null,
  },
}

const received: ReceivedCopy = {
  cardId: 'mtg:shivan-dragon',
  condition: 'LP',
  finish: 'foil',
  language: 'ja',
  setCode: 'M10',
}

const narrowed = (filters: Partial<WantFilters>): WantTarget => ({
  ...anyPrinting,
  filters: {
    ...anyPrinting.filters,
    ...filters,
  },
})

describe('fulfilsWant', () => {
  it('accepts any Printing of its Card when no filter is set', () => {
    expect(fulfilsWant(received, anyPrinting)).toBe(true)
    expect(fulfilsWant({
      ...received,
      condition: 'PO',
      finish: 'nonfoil',
      language: 'en',
      setCode: 'LEA',
    }, anyPrinting)).toBe(true)
  })

  it('never accepts a Printing of another Card', () => {
    expect(fulfilsWant({
      ...received,
      cardId: 'mtg:lightning-bolt',
    }, anyPrinting)).toBe(false)
  })

  it('binds the Set when one is set', () => {
    expect(fulfilsWant(received, narrowed({ setCode: 'M10' }))).toBe(true)
    expect(fulfilsWant(received, narrowed({ setCode: 'LEA' }))).toBe(false)
  })

  it('binds the finish when one is set', () => {
    expect(fulfilsWant(received, narrowed({ finish: 'foil' }))).toBe(true)
    expect(fulfilsWant(received, narrowed({ finish: 'nonfoil' }))).toBe(false)
  })

  it('binds the language when one is set', () => {
    expect(fulfilsWant(received, narrowed({ language: 'ja' }))).toBe(true)
    expect(fulfilsWant(received, narrowed({ language: 'en' }))).toBe(false)
  })

  it('accepts the minimum condition or better, nothing worse', () => {
    expect(fulfilsWant(received, narrowed({ minCondition: 'LP' }))).toBe(true)
    expect(fulfilsWant(received, narrowed({ minCondition: 'PL' }))).toBe(true)
    expect(fulfilsWant(received, narrowed({ minCondition: 'EX' }))).toBe(false)
  })

  it('needs every filter that is set', () => {
    expect(fulfilsWant(received, narrowed({
      finish: 'foil',
      language: 'en',
    }))).toBe(false)
  })
})

describe('fulfilWants', () => {
  const want = (id: string, quantity: number, filters: Partial<WantFilters> = {}) => ({
    ...narrowed(filters),
    id,
    quantity,
  })

  it('reduces fulfilled Wants in order, never below zero, and leaves the rest alone', () => {
    const wants = [want('nonfoil-only', 2, { finish: 'nonfoil' }), want('any-a', 1), want('any-b', 4)]
    expect(fulfilWants(wants, {
      ...received,
      quantity: 3,
    })).toEqual([{
      id: 'any-a',
      quantity: 0,
    }, {
      id: 'any-b',
      quantity: 2,
    }])
  })

  it('changes nothing when no Want is fulfilled', () => {
    expect(fulfilWants([want('english', 1, { language: 'en' })], {
      ...received,
      quantity: 1,
    })).toEqual([])
  })
})
