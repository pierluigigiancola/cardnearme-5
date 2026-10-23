import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// ADR 0001: the domain module is pure TypeScript. It may import its own files
// and the service contract types, nothing else (no React, Supabase or mocks).
const allowed = (source: string) => source.startsWith('./') || source === '#/services/types'

describe('domain module', () => {
  const dir = import.meta.dirname
  const files = readdirSync(dir).filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))

  it.each(files)('%s imports only domain files and contract types', (file) => {
    const code = readFileSync(join(dir, file), 'utf8')
    const sources = [...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(match => match[1])
    expect(sources.filter(source => !allowed(source))).toEqual([])
  })
})
