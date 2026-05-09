import { describe, expect, it } from 'bun:test'
import { extractAmazonAffiliate } from './amazonAffiliate.js'

describe('extractAmazonAffiliate', () => {
  it('should extract target URL appended after the click id', () => {
    const url = new URL(
      'https://aax-us-east.amazon-adsystem.com/x/c/abc123/https://www.amazon.com/dp/B0EXAMPLE',
    )

    expect(extractAmazonAffiliate(url)).toBe('https://www.amazon.com/dp/B0EXAMPLE')
  })

  it('should accept http:// targets', () => {
    const url = new URL('https://aax-eu.amazon-adsystem.com/x/c/xyz789/http://example.com/page')

    expect(extractAmazonAffiliate(url)).toBe('http://example.com/page')
  })

  it('should return null when the path lacks an embedded URL', () => {
    const url = new URL('https://aax-us-east.amazon-adsystem.com/x/c/abc123/')

    expect(extractAmazonAffiliate(url)).toBeUndefined()
  })

  it('should return null for non-tracker paths', () => {
    const url = new URL(
      'https://aax-us-east.amazon-adsystem.com/aap/?id=abc&dest=https%3A%2F%2Fexample.com',
    )

    expect(extractAmazonAffiliate(url)).toBeUndefined()
  })

  it('should return null for non-Amazon hosts', () => {
    const url = new URL('https://example.com/x/c/abc/https://other.com/dp/X')

    expect(extractAmazonAffiliate(url)).toBeUndefined()
  })
})
