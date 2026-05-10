import { describe, expect, it } from 'bun:test'
import { extractInstagramShim } from './instagram.js'

describe('extractInstagramShim', () => {
  it('should extract target from u param on l.instagram.com', () => {
    const url = new URL('https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fpage&e=ABC&s=1')

    expect(extractInstagramShim(url)).toBe('https://example.com/page')
  })

  it('should extract target from u param on lm.instagram.com', () => {
    const url = new URL('https://lm.instagram.com/?u=https%3A%2F%2Fexample.com%2Fpage')

    expect(extractInstagramShim(url)).toBe('https://example.com/page')
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://l.instagram.com/?e=ABC')

    expect(extractInstagramShim(url)).toBeUndefined()
  })

  it('should return null for non-Instagram hosts', () => {
    const url = new URL('https://example.com/?u=https%3A%2F%2Fother.com')

    expect(extractInstagramShim(url)).toBeUndefined()
  })
})
