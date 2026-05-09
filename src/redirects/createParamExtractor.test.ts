import { describe, expect, it } from 'bun:test'
import { createParamExtractor } from './createParamExtractor.js'

describe('createParamExtractor', () => {
  it('should extract param value when single host string and path match', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://example.com/redirect?url=https%3A%2F%2Ftarget.com%2Fpage')

    expect(extractor(url)).toBe('https://target.com/page')
  })

  it('should return null when single host string does not match', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://other.com/redirect?url=https%3A%2F%2Ftarget.com')

    expect(extractor(url)).toBeNull()
  })

  it('should return null when path is required but does not match', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://example.com/other?url=https%3A%2F%2Ftarget.com')

    expect(extractor(url)).toBeNull()
  })

  it('should extract param value when second host in array matches', () => {
    const extractor = createParamExtractor({
      hosts: ['first.com', 'second.com'],
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://second.com/redirect?url=https%3A%2F%2Ftarget.com%2Fpage')

    expect(extractor(url)).toBe('https://target.com/page')
  })

  it('should return null when no host in array matches', () => {
    const extractor = createParamExtractor({
      hosts: ['first.com', 'second.com'],
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://other.com/redirect?url=https%3A%2F%2Ftarget.com')

    expect(extractor(url)).toBeNull()
  })

  it('should extract param value when no path is configured', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      params: ['url'],
    })
    const url = new URL('https://example.com/any/path?url=https%3A%2F%2Ftarget.com%2Fpage')

    expect(extractor(url)).toBe('https://target.com/page')
  })

  it('should return value of first param when first param is present', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      params: ['url', 'q'],
    })
    const url = new URL(
      'https://example.com/?url=https%3A%2F%2Ffirst.com&q=https%3A%2F%2Fsecond.com',
    )

    expect(extractor(url)).toBe('https://first.com')
  })

  it('should return value of second param when first param is missing', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      params: ['url', 'q'],
    })
    const url = new URL('https://example.com/?q=https%3A%2F%2Fsecond.com')

    expect(extractor(url)).toBe('https://second.com')
  })

  it('should return null when all params are missing', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      params: ['url', 'q'],
    })
    const url = new URL('https://example.com/?other=value')

    expect(extractor(url)).toBeNull()
  })

  it('should fall through to next param when first param is empty string', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      params: ['url', 'q'],
    })
    const url = new URL('https://example.com/?url=&q=https%3A%2F%2Fsecond.com')

    expect(extractor(url)).toBe('https://second.com')
  })

  it('should extract param value when regex host matches', () => {
    const extractor = createParamExtractor({
      hosts: /^(?:www\.)?example\.(?:com|co\.uk)$/,
      path: '/redirect',
      params: ['url'],
    })
    const urlCom = new URL('https://www.example.com/redirect?url=https%3A%2F%2Ftarget.com')
    const urlCoUk = new URL('https://example.co.uk/redirect?url=https%3A%2F%2Ftarget.com')

    expect(extractor(urlCom)).toBe('https://target.com')
    expect(extractor(urlCoUk)).toBe('https://target.com')
  })

  it('should return null when regex host does not match', () => {
    const extractor = createParamExtractor({
      hosts: /^(?:www\.)?example\.(?:com|co\.uk)$/,
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://other.com/redirect?url=https%3A%2F%2Ftarget.com')

    expect(extractor(url)).toBeNull()
  })
})
