import { describe, expect, it } from 'bun:test'
import { extractNarrativ } from './narrativ.js'

describe('extractNarrativ', () => {
  it('should extract target from url param on narrativ.com', () => {
    const url = new URL(
      'https://narrativ.com/api/v0/client_redirect?url=https%3A%2F%2Fexample.com%2Fbuy',
    )

    expect(extractNarrativ(url)).toBe('https://example.com/buy')
  })

  it('should extract target from url param on api.narrativ.com', () => {
    const url = new URL(
      'https://api.narrativ.com/api/v0/client_redirect?url=https%3A%2F%2Fexample.com%2Fitem',
    )

    expect(extractNarrativ(url)).toBe('https://example.com/item')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://narrativ.com/api/v0/client_redirect?other=value')

    expect(extractNarrativ(url)).toBeNull()
  })

  it('should return null for non-Narrativ hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractNarrativ(url)).toBeNull()
  })
})
