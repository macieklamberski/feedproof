import { describe, expect, it } from 'bun:test'
import { extractSspai } from './sspai.js'

describe('extractSspai', () => {
  it('should extract target from target param', () => {
    const url = new URL('https://sspai.com/link?target=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractSspai(url)).toBe('https://example.com/article')
  })

  it('should return null when target param is missing', () => {
    const url = new URL('https://sspai.com/link?other=value')

    expect(extractSspai(url)).toBeUndefined()
  })

  it('should return null for non-link Sspai paths', () => {
    const url = new URL('https://sspai.com/post?target=https%3A%2F%2Fexample.com')

    expect(extractSspai(url)).toBeUndefined()
  })

  it('should return null for non-Sspai hosts', () => {
    const url = new URL('https://example.com/link?target=https%3A%2F%2Fother.com')

    expect(extractSspai(url)).toBeUndefined()
  })
})
