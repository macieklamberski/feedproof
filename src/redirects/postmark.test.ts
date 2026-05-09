import { describe, expect, it } from 'bun:test'
import { extractPostmark } from './postmark.js'

describe('extractPostmark', () => {
  it('should extract URL-encoded target from a 3s path', () => {
    const url = new URL('https://click.pstmrk.it/3s/example.com%2Farticle/abc123/def456')

    expect(extractPostmark(url)).toBe('example.com/article')
  })

  it('should accept 2t version prefix', () => {
    const url = new URL('https://click.pstmrk.it/2t/example.com%2Fpath/xyz789/qrs012')

    expect(extractPostmark(url)).toBe('example.com/path')
  })

  it('should accept 3t version prefix', () => {
    const url = new URL('https://click.pstmrk.it/3t/example.com%2Fother/aaa/bbb')

    expect(extractPostmark(url)).toBe('example.com/other')
  })

  it('should return null for an unrecognised version prefix', () => {
    const url = new URL('https://click.pstmrk.it/4s/example.com%2Farticle/abc/def')

    expect(extractPostmark(url)).toBeNull()
  })

  it('should return null when path has too few segments', () => {
    const url = new URL('https://click.pstmrk.it/3s/example.com%2Farticle')

    expect(extractPostmark(url)).toBeNull()
  })

  it('should return null for non-Postmark hosts', () => {
    const url = new URL('https://example.com/3s/other.com/abc/def')

    expect(extractPostmark(url)).toBeNull()
  })

  it('should return null when the encoded path segment is malformed', () => {
    // `%ZZ` is not a valid percent escape and breaks decodeURIComponent.
    const url = new URL('https://click.pstmrk.it/3s/bad%ZZ/abc/def')

    expect(extractPostmark(url)).toBeNull()
  })
})
