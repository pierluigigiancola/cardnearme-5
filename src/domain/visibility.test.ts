import { describe, expect, it } from 'vitest'

import { publicOnly } from './visibility'

const lists = [
  {
    id: 'trade-binder',
    visibility: 'public' as const, 
  },
  {
    id: 'bulk-rares',
    visibility: 'private' as const, 
  },
]

describe('Lists hold visibility', () => {
  it('keeps only the entries on public Lists, in order, hiding private and unknown Lists', () => {
    const entries = [
      {
        id: 'a',
        listId: 'bulk-rares', 
      },
      {
        id: 'b',
        listId: 'trade-binder', 
      },
      {
        id: 'c',
        listId: 'missing', 
      },
      {
        id: 'd',
        listId: 'trade-binder', 
      },
    ]
    expect(publicOnly(entries, lists).map(entry => entry.id)).toEqual(['b', 'd'])
  })
})
