import { describe, expect, it } from 'bun:test'
import { extractWebArchive } from './webArchive.js'

describe('extractWebArchive', () => {
  it('should extract original URL from snapshot path', () => {
    const url = new URL(
      'https://web.archive.org/web/20240101120000/https%3A%2F%2Fexample.com%2Farticle',
    )

    expect(extractWebArchive(url)).toBe('https://example.com/article')
  })

  it('should accept the wildcard suffix on the timestamp', () => {
    const url = new URL(
      'https://web.archive.org/web/20240101120000*/https%3A%2F%2Fexample.com%2Fpage',
    )

    expect(extractWebArchive(url)).toBe('https://example.com/page')
  })

  it('should return null when timestamp has wrong digit count', () => {
    const url = new URL('https://web.archive.org/web/2024/https%3A%2F%2Fexample.com')

    expect(extractWebArchive(url)).toBeNull()
  })

  it('should return null for non-archive.org hosts', () => {
    const url = new URL('https://example.com/web/20240101120000/https%3A%2F%2Fother.com')

    expect(extractWebArchive(url)).toBeNull()
  })

  it('should return null when encoded URL has malformed percent escapes', () => {
    const url = new URL('https://web.archive.org/web/20240101120000/bad%ZZ')

    expect(extractWebArchive(url)).toBeNull()
  })
})
