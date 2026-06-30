import { describe, expect, it } from 'bun:test'
import { coerceNumber } from './numbers.js'

describe('coerceNumber', () => {
  it('should parse integer string to number', () => {
    expect(coerceNumber('42')).toBe(42)
  })

  it('should parse float string to number', () => {
    expect(coerceNumber('1.5')).toBe(1.5)
  })

  it('should parse negative string to number', () => {
    expect(coerceNumber('-1')).toBe(-1)
  })

  it('should parse zero string to number', () => {
    expect(coerceNumber('0')).toBe(0)
  })

  it('should return undefined for null input', () => {
    expect(coerceNumber(null)).toBeUndefined()
  })

  it('should return undefined for non-numeric string', () => {
    expect(coerceNumber('abc')).toBeUndefined()
  })

  // Empty string coerces to 0 via Number(''). Pinned so a future refactor that
  // switches to a stricter parser must update this test deliberately.
  it('should return 0 for empty string', () => {
    expect(coerceNumber('')).toBe(0)
  })

  it('should parse string with surrounding whitespace', () => {
    expect(coerceNumber('  42  ')).toBe(42)
  })

  it('should return undefined for partially numeric string', () => {
    expect(coerceNumber('42abc')).toBeUndefined()
  })

  it('should parse scientific notation string', () => {
    expect(coerceNumber('1e3')).toBe(1000)
  })

  it('should parse hexadecimal string', () => {
    expect(coerceNumber('0x10')).toBe(16)
  })

  // Number('Infinity') is not NaN, so Infinity flows through the guard. Pinned so
  // a future finiteness check must update this test deliberately.
  it('should return Infinity for the string Infinity', () => {
    expect(coerceNumber('Infinity')).toBe(Number.POSITIVE_INFINITY)
  })
})
