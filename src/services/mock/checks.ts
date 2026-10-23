/**
 * Small runtime checks for JSON arguments that reach the mock RPC. Each check
 * answers whether a value has the expected shape; `shape` rejects unknown
 * keys so a caller cannot smuggle extra fields into a record.
 */

export type Check = (value: unknown) => boolean

export const str: Check = value => typeof value === 'string'
export const num: Check = value => typeof value === 'number' && Number.isFinite(value)
export const bool: Check = value => typeof value === 'boolean'

export function oneOf(...values: readonly string[]): Check {
  return value => typeof value === 'string' && values.includes(value)
}

export function optional(check: Check): Check {
  return value => value === undefined || check(value)
}

export function nullable(check: Check): Check {
  return value => value === null || check(value)
}

export function either(...checks: Check[]): Check {
  return value => checks.some(check => check(value))
}

export function arrayOf(check: Check): Check {
  return value => Array.isArray(value) && value.every(check)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** A plain object whose values all pass `check`. */
export function recordOf(check: Check): Check {
  return value => isPlainObject(value) && Object.values(value).every(check)
}

/** A plain object with exactly these fields (missing ones are read as `undefined`). */
export function shape(fields: Record<string, Check>): Check {
  return value => isPlainObject(value)
    && Object.keys(value).every(key => Object.hasOwn(fields, key))
    && Object.entries(fields).every(([key, check]) => check(value[key]))
}

/** Like `shape`, but extra fields are allowed (for records the server re-reads by id). */
export function looseShape(fields: Record<string, Check>): Check {
  return value => isPlainObject(value) && Object.entries(fields).every(([key, check]) => check(value[key]))
}

export type ArgsCheck = (args: readonly unknown[]) => boolean

/** An argument list: at most one value per check, missing trailing ones read as `undefined`. */
export function args(...checks: Check[]): ArgsCheck {
  return list => list.length <= checks.length && checks.every((check, index) => check(list[index]))
}
