import { describe, expect, it } from 'bun:test'
import { chooseBaseUrl, coerceNumber } from './utils.js'

describe('chooseBaseUrl', () => {
  it('should prefer itemUrl when available', () => {
    const value = chooseBaseUrl(
      'https://example.com/post/1',
      'https://example.com',
      'https://example.com/feed.xml',
    )
    const expected = 'https://example.com/post/1'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is null', () => {
    const value = chooseBaseUrl(null, 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is undefined', () => {
    const value = chooseBaseUrl(undefined, 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is not http/https', () => {
    const value = chooseBaseUrl(
      'ftp://files.example.com/post',
      'https://example.com',
      'https://example.com/feed.xml',
    )
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is invalid', () => {
    const value = chooseBaseUrl('not-a-url', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should resolve relative siteUrl against feedUrl', () => {
    const value = chooseBaseUrl(null, '/', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should resolve relative path siteUrl against feedUrl', () => {
    const value = chooseBaseUrl(null, '/blog', 'https://example.com/feed.xml')
    const expected = 'https://example.com/blog'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when both itemUrl and siteUrl are null', () => {
    const value = chooseBaseUrl(null, null, 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when siteUrl resolves to non-http', () => {
    const value = chooseBaseUrl(null, 'ftp://files.example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should return undefined when no URL yields http/https', () => {
    expect(chooseBaseUrl(null, null, 'not-a-url')).toBeUndefined()
  })

  it('should return undefined when feedUrl is not http/https', () => {
    expect(chooseBaseUrl(null, null, 'ftp://example.com/feed')).toBeUndefined()
  })

  it('should skip itemUrl and siteUrl falling through to feedUrl', () => {
    const value = chooseBaseUrl('not-a-url', 'ftp://bad', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should preserve itemUrl path for relative content resolution', () => {
    const value = chooseBaseUrl(
      'https://example.com/newsletter/dispatch-015/',
      'https://example.com',
      'https://example.com/index.xml',
    )
    const expected = 'https://example.com/newsletter/dispatch-015/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is an empty string', () => {
    const value = chooseBaseUrl('', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when siteUrl is an empty string', () => {
    const value = chooseBaseUrl(null, '', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should return undefined when all inputs are empty strings', () => {
    expect(chooseBaseUrl('', '', '')).toBeUndefined()
  })

  it('should fall back to siteUrl when itemUrl is relative', () => {
    const value = chooseBaseUrl('/post/1', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })
})

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
