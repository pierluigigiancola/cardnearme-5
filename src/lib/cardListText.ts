import { isCondition, isLanguage } from '#/lib/cardOptions'
import type { DeckSection, Finish, ParsedImportRow } from '#/services/types'

/**
 * Parsers for card lists people paste or export from other tools. Pure
 * functions so the import wizard and the deck builder share them (and they
 * are easy to unit test).
 */

export interface ListParseError {
  line: number
  raw: string
  message: string
}

export interface TextListRow extends ParsedImportRow { section: DeckSection }

const sectionHeaders: [RegExp, DeckSection][] = [
  [/^(commanders?|command zone)$/i, 'commander'],
  [/^(deck|main|mainboard|main deck)$/i, 'mainboard'],
  [/^(sideboard|side|sb)$/i, 'sideboard'],
  [/^(maybeboard|maybe|considering)$/i, 'considering'],
]

// "4x Lightning Bolt (M10) 146 *F*", "1 Sol Ring [CMM] #400", "Counterspell".
// Only the quantity's x is case-insensitive: an `i` flag would also read *e* as foil.
const linePattern = /^(?:(\d+)\s*[xX]?\s+)?(.+?)(?:\s+[([]([A-Za-z0-9]{2,6})[)\]](?:\s+#?([A-Za-z0-9-]+))?)?(\s+\*(?:F|E)\*)?$/

function finishFromMarker(marker: string | undefined): Finish {
  if (!marker) return 'nonfoil'
  return marker.includes('E') ? 'etched' : 'foil'
}

/** Parses one card per line ("4 Card Name (SET) 123"); section headers switch deck sections. */
export function parseTextList(text: string): {
  rows: TextListRow[];
  errors: ListParseError[]
} {
  const rows: TextListRow[] = []
  const errors: ListParseError[] = []
  let section: DeckSection = 'mainboard'

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1
    let raw = rawLine.trim()
    if (!raw || raw.startsWith('//') || raw.startsWith('#')) return
    const header = sectionHeaders.find(([pattern]) => pattern.test(raw.replace(/:$/, '')))
    if (header) {
      section = header[1]
      return
    }
    let rowSection = section
    if (/^SB:\s*/i.test(raw)) {
      rowSection = 'sideboard'
      raw = raw.replace(/^SB:\s*/i, '')
    }
    const match = linePattern.exec(raw)
    const name = match?.at(2)?.trim()
    if (!match || !name) {
      errors.push({
        line,
        message: 'Could not read this line',
        raw: rawLine,
      })
      return
    }
    rows.push({
      condition: null,
      finish: finishFromMarker(match.at(5)),
      language: null,
      line,
      name,
      number: match.at(4) ?? null,
      quantity: Math.max(1, Number(match.at(1) ?? 1)),
      raw: rawLine,
      section: rowSection,
      setCode: match.at(3)?.toUpperCase() ?? null,
    })
  })

  return {
    errors,
    rows,
  }
}

/** Splits one CSV line, honouring double-quoted fields. */
function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line.charAt(index)
    if (quoted) {
      if (char === '"' && line.charAt(index + 1) === '"') {
        current += '"'
        index++
      }
      else if (char === '"') quoted = false
      else current += char
    }
    else if (char === '"') quoted = true
    else if (char === delimiter) {
      cells.push(current.trim())
      current = ''
    }
    else current += char
  }
  cells.push(current.trim())
  return cells
}

const csvColumns = {
  condition: ['condition', 'cond'],
  finish: ['finish', 'foil', 'printing'],
  language: ['language', 'lang'],
  name: ['name', 'card', 'card name', 'cardname'],
  number: ['number', 'collector number', 'collector_number', 'cn', 'no'],
  quantity: ['quantity', 'qty', 'count', 'amount'],
  setCode: ['set', 'set code', 'set_code', 'edition', 'expansion'],
}

function finishFromCell(value: string | undefined): Finish {
  const normalised = value?.trim().toLowerCase() ?? ''
  if (normalised.includes('etched')) return 'etched'
  if (['foil', 'yes', 'true', '1'].includes(normalised)) return 'foil'
  return 'nonfoil'
}

/** Parses a CSV export with a header row (columns are matched by common names). */
export function parseCsvList(text: string): {
  rows: ParsedImportRow[];
  errors: ListParseError[]
} {
  const lines = text.split(/\r?\n/)
  const headerIndex = lines.findIndex(line => line.trim() !== '')
  const headerLine = headerIndex === -1 ? undefined : lines.at(headerIndex)
  if (headerLine === undefined) {
    return {
      errors: [],
      rows: [],
    }
  }
  const delimiter = (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const header = splitCsvLine(headerLine, delimiter).map(cell => cell.toLowerCase())
  const column = (aliases: string[]) => header.findIndex(cell => aliases.includes(cell))
  const columns = {
    condition: column(csvColumns.condition),
    finish: column(csvColumns.finish),
    language: column(csvColumns.language),
    name: column(csvColumns.name),
    number: column(csvColumns.number),
    quantity: column(csvColumns.quantity),
    setCode: column(csvColumns.setCode),
  }
  if (columns.name === -1) {
    return {
      errors: [{
        line: headerIndex + 1,
        message: 'The CSV needs a "Name" column',
        raw: headerLine,
      }],
      rows: [],
    }
  }

  const rows: ParsedImportRow[] = []
  const errors: ListParseError[] = []
  lines.forEach((rawLine, index) => {
    if (index <= headerIndex || !rawLine.trim()) return
    const cells = splitCsvLine(rawLine, delimiter)
    const cell = (position: number) => (position === -1 ? undefined : cells[position]?.trim() || undefined)
    const name = cell(columns.name)
    if (!name) {
      errors.push({
        line: index + 1,
        message: 'Missing card name',
        raw: rawLine,
      })
      return
    }
    const quantity = Number(cell(columns.quantity) ?? 1)
    const condition = cell(columns.condition)?.toUpperCase()
    const language = cell(columns.language)?.toLowerCase()
    rows.push({
      condition: isCondition(condition) ? condition : null,
      finish: finishFromCell(cell(columns.finish)),
      language: isLanguage(language) ? language : null,
      line: index + 1,
      name,
      number: cell(columns.number) ?? null,
      quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
      raw: rawLine,
      setCode: cell(columns.setCode)?.toUpperCase() ?? null,
    })
  })
  return {
    errors,
    rows,
  }
}

const sectionTitles: Record<DeckSection, string> = {
  commander: 'Commander',
  considering: 'Maybeboard',
  mainboard: 'Deck',
  sideboard: 'Sideboard',
}

/** Exports deck entries as text that `parseTextList` (and most deck tools) read back. */
export function formatTextList(entries: {
  quantity: number;
  section: DeckSection;
  card: {
    name: string;
    setCode: string;
    number: string
  }
}[]) {
  const order: DeckSection[] = ['commander', 'mainboard', 'sideboard', 'considering']
  return order
    .map((section) => {
      const lines = entries
        .filter(entry => entry.section === section)
        .map(entry => `${entry.quantity} ${entry.card.name} (${entry.card.setCode.toUpperCase()}) ${entry.card.number}`)
      return lines.length > 0 ? [sectionTitles[section], ...lines].join('\n') : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
