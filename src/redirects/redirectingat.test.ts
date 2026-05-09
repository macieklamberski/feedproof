import { describe, expect, it } from 'bun:test'
import { extractRedirectingat } from './redirectingat.js'

describe('extractRedirectingat', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://redirectingat.com/?url=https%3A%2F%2Fexample.com%2Fproduct')

    expect(extractRedirectingat(url)).toBe('https://example.com/product')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://redirectingat.com/?other=value')

    expect(extractRedirectingat(url)).toBeNull()
  })

  it('should return null for non-redirectingat hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractRedirectingat(url)).toBeNull()
  })
})
