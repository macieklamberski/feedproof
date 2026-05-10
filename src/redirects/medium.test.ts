import { describe, expect, it } from 'bun:test'
import { extractMedium } from './medium.js'

describe('extractMedium', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://medium.com/r/?url=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractMedium(url)).toBe('https://example.com/article')
  })

  it('should return null for non-redirect Medium URLs', () => {
    const url = new URL('https://medium.com/@author/article-slug')

    expect(extractMedium(url)).toBeUndefined()
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://medium.com/r/')

    expect(extractMedium(url)).toBeUndefined()
  })

  it('should return null for non-Medium hosts', () => {
    const url = new URL('https://example.com/r/?url=https%3A%2F%2Fother.com')

    expect(extractMedium(url)).toBeUndefined()
  })
})
