import { describe, expect, it } from 'vitest'

import { formatTextList, parseCsvList, parseTextList } from './cardListText'

import type { DeckSection } from '#/services/types'

describe('parseTextList', () => {
  it('reads quantity, name, set and collector number', () => {
    const { errors, rows } = parseTextList('4 Lightning Bolt (M10) 146')
    expect(errors).toEqual([])
    expect(rows).toEqual([{
      condition: null,
      finish: 'nonfoil',
      language: null,
      line: 1,
      name: 'Lightning Bolt',
      number: '146',
      quantity: 4,
      raw: '4 Lightning Bolt (M10) 146',
      section: 'mainboard',
      setCode: 'M10',
    }])
  })

  it.each([
    ['4x Lightning Bolt', 4],
    ['4X Lightning Bolt', 4],
    ['4 x Lightning Bolt', 4],
    ['4 X Lightning Bolt', 4],
    ['12 Lightning Bolt', 12],
    ['Lightning Bolt', 1],
    ['0 Lightning Bolt', 1],
  ])('reads the quantity of "%s" as %i', (text, quantity) => {
    const [row] = parseTextList(text).rows
    expect(row.quantity).toBe(quantity)
    expect(row.name).toBe('Lightning Bolt')
  })

  it('keeps a leading X that belongs to the card name', () => {
    expect(parseTextList('4 Xenagos, the Reveler').rows[0]).toMatchObject({
      name: 'Xenagos, the Reveler',
      quantity: 4,
    })
  })

  it('never reads a lowercase *e* marker as foil', () => {
    expect(parseTextList('1 Sol Ring (CMM) 400 *e*').rows[0]?.finish).not.toBe('foil')
  })

  it('keeps leading digits that belong to the card name', () => {
    expect(parseTextList('1 Borrowing 100,000 Arrows').rows[0]).toMatchObject({
      name: 'Borrowing 100,000 Arrows',
      quantity: 1,
    })
  })

  it.each([
    ['1 Sol Ring (CMM) 400', 'CMM', '400'],
    ['1 Sol Ring [cmm] #400', 'CMM', '400'],
    ['1 Sol Ring (cmm)', 'CMM', null],
    ['1 Fire // Ice (MH2) 290a', 'MH2', '290a'],
    ['1 Lightning Bolt (PLST) M10-146', 'PLST', 'M10-146'],
  ])('reads the printing of "%s"', (text, setCode, number) => {
    const [row] = parseTextList(text).rows
    expect(row.setCode).toBe(setCode)
    expect(row.number).toBe(number)
  })

  it('does not mistake long parentheticals for set codes', () => {
    expect(parseTextList('1 Erase (Not the Urza\'s Legacy One)').rows[0]).toMatchObject({
      name: 'Erase (Not the Urza\'s Legacy One)',
      number: null,
      setCode: null,
    })
  })

  it.each([
    ['4 Lightning Bolt (M10) 146 *F*', 'foil'],
    ['4 Lightning Bolt (M10) 146 *E*', 'etched'],
    ['4 Lightning Bolt *F*', 'foil'],
    ['4 Lightning Bolt (M10) 146', 'nonfoil'],
  ])('reads the finish of "%s" as %s', (text, finish) => {
    const [row] = parseTextList(text).rows
    expect(row.finish).toBe(finish)
    expect(row.name).toBe('Lightning Bolt')
  })

  it('switches sections on headers, with or without a colon and in any case', () => {
    const text = [
      'Commander',
      '1 Atraxa, Praetors\' Voice',
      'DECK:',
      '1 Sol Ring',
      'Sideboard:',
      '1 Duress',
      'maybeboard',
      '1 Rhystic Study',
      'SB',
      '1 Negate',
      'Main deck',
      '1 Island',
    ].join('\n')
    const { errors, rows } = parseTextList(text)
    expect(errors).toEqual([])
    expect(rows.map(row => [row.name, row.section])).toEqual([
      ['Atraxa, Praetors\' Voice', 'commander'],
      ['Sol Ring', 'mainboard'],
      ['Duress', 'sideboard'],
      ['Rhystic Study', 'considering'],
      ['Negate', 'sideboard'],
      ['Island', 'mainboard'],
    ])
  })

  it.each([
    ['Commanders', 'commander'],
    ['Command zone', 'commander'],
    ['Main', 'mainboard'],
    ['Mainboard', 'mainboard'],
    ['Side', 'sideboard'],
    ['Maybe', 'considering'],
    ['Considering', 'considering'],
  ])('treats "%s" as the %s header', (header, section) => {
    expect(parseTextList(`${header}\n1 Opt`).rows[0]?.section).toBe(section)
  })

  it('puts "SB:" lines in the sideboard without changing the current section', () => {
    const { rows } = parseTextList('Commander\n1 Atraxa\nSB: 2 Duress\nsb:1 Negate\n1 Sol Ring')
    expect(rows.map(row => [row.quantity, row.name, row.section])).toEqual([
      [1, 'Atraxa', 'commander'],
      [2, 'Duress', 'sideboard'],
      [1, 'Negate', 'sideboard'],
      [1, 'Sol Ring', 'commander'],
    ])
    expect(rows[1]?.raw).toBe('SB: 2 Duress')
  })

  it('skips blank lines and comments but keeps 1-based line numbers', () => {
    const text = '// Burn\n\n# exported from somewhere\n   \n4 Lightning Bolt\r\n4 Lava Spike'
    const { errors, rows } = parseTextList(text)
    expect(errors).toEqual([])
    expect(rows.map(row => [row.line, row.name])).toEqual([
      [5, 'Lightning Bolt'],
      [6, 'Lava Spike'],
    ])
  })

  it('reports lines it cannot read with their number and raw text', () => {
    // `.` in the line pattern does not match line separators, so a stray CR
    // (old Mac line ending) or U+2028 inside a line cannot be read.
    const text = '4 Lightning Bolt\n4 Lava\rSpike\n  1 Shock Spike  \n1 Opt'
    const { errors, rows } = parseTextList(text)
    expect(rows.map(row => row.name)).toEqual(['Lightning Bolt', 'Opt'])
    expect(errors).toEqual([
      {
        line: 2,
        message: 'Could not read this line',
        raw: '4 Lava\rSpike',
      },
      {
        line: 3,
        message: 'Could not read this line',
        raw: '  1 Shock Spike  ',
      },
    ])
  })

  it('returns nothing for empty input', () => {
    expect(parseTextList('')).toEqual({
      errors: [],
      rows: [],
    })
  })
})

describe('parseCsvList', () => {
  it('reads a comma-separated export with every column', () => {
    const text = [
      'Name,Quantity,Set,Collector Number,Foil,Condition,Language',
      'Lightning Bolt,4,m10,146,foil,nm,EN',
    ].join('\n')
    const { errors, rows } = parseCsvList(text)
    expect(errors).toEqual([])
    expect(rows).toEqual([{
      condition: 'NM',
      finish: 'foil',
      language: 'en',
      line: 2,
      name: 'Lightning Bolt',
      number: '146',
      quantity: 4,
      raw: 'Lightning Bolt,4,m10,146,foil,nm,EN',
      setCode: 'M10',
    }])
  })

  it('switches to semicolons when the header has more of them than commas', () => {
    const text = 'Card Name;Qty;Edition\nAtraxa, Praetors\' Voice;1;2xm\r\nSol Ring;2;CMM\r\n'
    const { errors, rows } = parseCsvList(text)
    expect(errors).toEqual([])
    expect(rows.map(row => [row.name, row.quantity, row.setCode])).toEqual([
      ['Atraxa, Praetors\' Voice', 1, '2XM'],
      ['Sol Ring', 2, 'CMM'],
    ])
  })

  it('honours quoted fields, escaped quotes and quoted headers', () => {
    const text = [
      '"Name","Count"',
      '"Borrowing 100,000 Arrows",2',
      '"Kongming, ""Sleeping Dragon""",1',
    ].join('\n')
    const { errors, rows } = parseCsvList(text)
    expect(errors).toEqual([])
    expect(rows.map(row => [row.name, row.quantity])).toEqual([
      ['Borrowing 100,000 Arrows', 2],
      ['Kongming, "Sleeping Dragon"', 1],
    ])
  })

  it.each([
    ['name', 'quantity', 'set', 'number', 'finish', 'condition', 'language'],
    ['Card', 'Qty', 'Set Code', 'Collector_Number', 'Printing', 'Cond', 'Lang'],
    ['CardName', 'Amount', 'set_code', 'CN', 'Foil', 'COND', 'lang'],
    ['card name', 'count', 'Expansion', 'No', 'finish', 'condition', 'LANGUAGE'],
  ])('matches header aliases %s / %s / %s / %s / %s / %s / %s', (...header) => {
    const { errors, rows } = parseCsvList(`${header.join(',')}\nSol Ring,3,cmm,400,etched,LP,it`)
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({
      condition: 'LP',
      finish: 'etched',
      language: 'it',
      name: 'Sol Ring',
      number: '400',
      quantity: 3,
      setCode: 'CMM',
    })
  })

  it('finds columns in any order and ignores unknown ones', () => {
    const { rows } = parseCsvList('Price,Qty,Notes,Name\n1.50,2,mint copy,Opt')
    expect(rows[0]).toMatchObject({
      name: 'Opt',
      number: null,
      quantity: 2,
      setCode: null,
    })
  })

  it('falls back to defaults for missing or unusable values', () => {
    const text = [
      'Name,Quantity,Condition,Language,Foil',
      'Opt,,,,',
      'Opt,abc,mint-ish,xx,no',
      'Opt,0,Near Mint,English,nonfoil',
      'Opt,2.5,,,',
      'Opt,-3,,,',
    ].join('\n')
    const { errors, rows } = parseCsvList(text)
    expect(errors).toEqual([])
    for (const row of rows) {
      expect(row).toMatchObject({
        condition: null,
        finish: 'nonfoil',
        language: null,
        quantity: 1,
      })
    }
    expect(rows).toHaveLength(5)
  })

  it.each([
    ['foil', 'foil'],
    ['Foil', 'foil'],
    ['yes', 'foil'],
    ['TRUE', 'foil'],
    ['1', 'foil'],
    ['etched', 'etched'],
    ['Etched Foil', 'etched'],
    ['normal', 'nonfoil'],
    ['', 'nonfoil'],
  ])('reads finish "%s" as %s', (value, finish) => {
    expect(parseCsvList(`Name,Finish\nOpt,${value}`).rows[0]?.finish).toBe(finish)
  })

  it('reports a missing Name column on the header line', () => {
    const text = '\n\nQuantity,Set\n4,M10'
    expect(parseCsvList(text)).toEqual({
      errors: [{
        line: 3,
        message: 'The CSV needs a "Name" column',
        raw: 'Quantity,Set',
      }],
      rows: [],
    })
  })

  it('reports rows with a blank name and keeps reading the rest', () => {
    const text = 'Name,Quantity\nOpt,4\n  ,2\n\n"",1\nShock,3'
    const { errors, rows } = parseCsvList(text)
    expect(rows.map(row => [row.line, row.name])).toEqual([
      [2, 'Opt'],
      [6, 'Shock'],
    ])
    expect(errors).toEqual([
      {
        line: 3,
        message: 'Missing card name',
        raw: '  ,2',
      },
      {
        line: 5,
        message: 'Missing card name',
        raw: '"",1',
      },
    ])
  })

  it('returns nothing for empty input', () => {
    expect(parseCsvList('')).toEqual({
      errors: [],
      rows: [],
    })
    expect(parseCsvList('\n  \n')).toEqual({
      errors: [],
      rows: [],
    })
  })
})

describe('formatTextList', () => {
  const entry = (section: DeckSection, quantity: number, name: string, setCode: string, number: string) => ({
    card: {
      name,
      number,
      setCode,
    },
    quantity,
    section,
  })

  const entries = [
    entry('sideboard', 2, 'Duress', 'm19', '94'),
    entry('mainboard', 1, 'Sol Ring', 'cmm', '400'),
    entry('considering', 1, 'Rhystic Study', 'PCY', '45'),
    entry('commander', 1, 'Atraxa, Praetors\' Voice', '2XM', '190'),
    entry('mainboard', 35, 'Island', 'UNF', '236'),
  ]

  it('groups entries by section in deck order with headers', () => {
    expect(formatTextList(entries)).toBe([
      'Commander',
      '1 Atraxa, Praetors\' Voice (2XM) 190',
      '',
      'Deck',
      '1 Sol Ring (CMM) 400',
      '35 Island (UNF) 236',
      '',
      'Sideboard',
      '2 Duress (M19) 94',
      '',
      'Maybeboard',
      '1 Rhystic Study (PCY) 45',
    ].join('\n'))
  })

  it('omits empty sections', () => {
    expect(formatTextList([entry('mainboard', 4, 'Opt', 'XLN', '65')])).toBe('Deck\n4 Opt (XLN) 65')
    expect(formatTextList([])).toBe('')
  })

  it('round-trips through parseTextList', () => {
    const { errors, rows } = parseTextList(formatTextList(entries))
    expect(errors).toEqual([])
    const parsed = rows.map(row => ({
      name: row.name,
      number: row.number,
      quantity: row.quantity,
      section: row.section,
      setCode: row.setCode,
    }))
    const expected = entries.map(({ card, quantity, section }) => ({
      name: card.name,
      number: card.number,
      quantity,
      section,
      setCode: card.setCode.toUpperCase(),
    }))
    expect(parsed).toHaveLength(expected.length)
    expect(parsed).toEqual(expect.arrayContaining(expected))
  })
})
