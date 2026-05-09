import { describe, expect, it } from 'bun:test'
import { extractPxf } from './pxf.js'

describe('extractPxf', () => {
  it('should extract target from u param on a merchant subdomain', () => {
    const url = new URL('https://merchant.pxf.io/?subId1=abc&u=https%3A%2F%2Fexample.com%2Fproduct')

    expect(extractPxf(url)).toBe('https://example.com/product')
  })

  it('should match different merchant subdomains', () => {
    const url = new URL('https://shop-store.pxf.io/?u=https%3A%2F%2Fexample.com%2Fitem')

    expect(extractPxf(url)).toBe('https://example.com/item')
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://merchant.pxf.io/?subId1=abc')

    expect(extractPxf(url)).toBeNull()
  })

  it('should return null for non-pxf hosts', () => {
    const url = new URL('https://example.com/?u=https%3A%2F%2Fother.com')

    expect(extractPxf(url)).toBeNull()
  })
})
