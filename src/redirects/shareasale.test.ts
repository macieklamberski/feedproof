import { describe, expect, it } from 'bun:test'
import { extractShareasale } from './shareasale.js'

describe('extractShareasale', () => {
  it('should extract target from urllink param', () => {
    const url = new URL(
      'https://shareasale.com/r.cfm?b=12345&u=67890&m=42&urllink=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractShareasale(url)).toBe('https://example.com/product')
  })

  it('should return null when urllink param is missing', () => {
    const url = new URL('https://shareasale.com/r.cfm?b=12345&u=67890')

    expect(extractShareasale(url)).toBeUndefined()
  })

  it('should return null for non-redirect ShareASale paths', () => {
    const url = new URL('https://shareasale.com/info?urllink=https%3A%2F%2Fexample.com')

    expect(extractShareasale(url)).toBeUndefined()
  })

  it('should return null for non-ShareASale hosts', () => {
    const url = new URL('https://example.com/r.cfm?urllink=https%3A%2F%2Fother.com')

    expect(extractShareasale(url)).toBeUndefined()
  })
})
