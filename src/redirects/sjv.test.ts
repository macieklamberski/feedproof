import { describe, expect, it } from 'bun:test'
import { extractSjv } from './sjv.js'

describe('extractSjv', () => {
  it('should extract target from u param on a merchant subdomain', () => {
    const url = new URL('https://merchant.sjv.io/?subId1=abc&u=https%3A%2F%2Fexample.com%2Fproduct')

    expect(extractSjv(url)).toBe('https://example.com/product')
  })

  it('should match different merchant subdomains', () => {
    const url = new URL('https://shop-store.sjv.io/?u=https%3A%2F%2Fexample.com%2Fitem')

    expect(extractSjv(url)).toBe('https://example.com/item')
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://merchant.sjv.io/?subId1=abc')

    expect(extractSjv(url)).toBeNull()
  })

  it('should return null for non-sjv hosts', () => {
    const url = new URL('https://example.com/?u=https%3A%2F%2Fother.com')

    expect(extractSjv(url)).toBeNull()
  })
})
