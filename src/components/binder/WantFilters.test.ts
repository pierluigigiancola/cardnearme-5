import { describe, expect, it } from 'vitest'

import { wantFilterLabels } from './WantFilters'

describe('wantFilterLabels', () => {
  it('reads "Any printing" for a Want with no filters', () => {
    expect(wantFilterLabels({
      finish: null,
      language: null,
      minCondition: null,
      setCode: null,
    })).toEqual(['Any printing'])
  })

  it('names each filter that is set', () => {
    expect(wantFilterLabels({
      finish: 'foil',
      language: 'it',
      minCondition: 'EX',
      setCode: 'm10',
    })).toEqual(['M10', 'Foil', 'Italian', 'EX+'])
  })
})
