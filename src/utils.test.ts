import { describe, expect, it } from 'bun:test'
import { chooseBaseUrl, createParamExtractor, isHttpUrl } from './utils.js'

const hostsRegex = /^(?:www\.)?example\.(?:com|co\.uk)$/

describe('isHttpUrl', () => {
  it('should return true for http url', () => {
    expect(isHttpUrl('http://example.com')).toBe(true)
  })

  it('should return true for https url', () => {
    expect(isHttpUrl('https://example.com/path?q=1')).toBe(true)
  })

  it('should return false for javascript scheme', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
  })

  it('should return false for data url', () => {
    expect(isHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('should return false for ftp scheme', () => {
    expect(isHttpUrl('ftp://example.com/file')).toBe(false)
  })

  it('should return false for relative url', () => {
    expect(isHttpUrl('/path/to/page')).toBe(false)
  })

  it('should return false for malformed url', () => {
    expect(isHttpUrl('not-a-url')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isHttpUrl('')).toBe(false)
  })

  it('should be case-insensitive on scheme', () => {
    expect(isHttpUrl('HTTPS://example.com')).toBe(true)
  })
})

describe('chooseBaseUrl', () => {
  it('should prefer itemUrl when available', () => {
    const value = chooseBaseUrl(
      'https://example.com/post/1',
      'https://example.com',
      'https://example.com/feed.xml',
    )
    const expected = 'https://example.com/post/1'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is null', () => {
    const value = chooseBaseUrl(null, 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is undefined', () => {
    const value = chooseBaseUrl(undefined, 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is not http/https', () => {
    const value = chooseBaseUrl(
      'ftp://files.example.com/post',
      'https://example.com',
      'https://example.com/feed.xml',
    )
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is invalid', () => {
    const value = chooseBaseUrl('not-a-url', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should resolve relative siteUrl against feedUrl', () => {
    const value = chooseBaseUrl(null, '/', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should resolve relative path siteUrl against feedUrl', () => {
    const value = chooseBaseUrl(null, '/blog', 'https://example.com/feed.xml')
    const expected = 'https://example.com/blog'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when both itemUrl and siteUrl are null', () => {
    const value = chooseBaseUrl(null, null, 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when siteUrl resolves to non-http', () => {
    const value = chooseBaseUrl(null, 'ftp://files.example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should return undefined when no URL yields http/https', () => {
    expect(chooseBaseUrl(null, null, 'not-a-url')).toBeUndefined()
  })

  it('should return undefined when feedUrl is not http/https', () => {
    expect(chooseBaseUrl(null, null, 'ftp://example.com/feed')).toBeUndefined()
  })

  it('should skip itemUrl and siteUrl falling through to feedUrl', () => {
    const value = chooseBaseUrl('not-a-url', 'ftp://bad', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should preserve itemUrl path for relative content resolution', () => {
    const value = chooseBaseUrl(
      'https://example.com/newsletter/dispatch-015/',
      'https://example.com',
      'https://example.com/index.xml',
    )
    const expected = 'https://example.com/newsletter/dispatch-015/'

    expect(value).toBe(expected)
  })
})

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

    expect(extractor(url)).toBeUndefined()
  })

  it('should return null when path is required but does not match', () => {
    const extractor = createParamExtractor({
      hosts: 'example.com',
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://example.com/other?url=https%3A%2F%2Ftarget.com')

    expect(extractor(url)).toBeUndefined()
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

    expect(extractor(url)).toBeUndefined()
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

    expect(extractor(url)).toBeUndefined()
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
      hosts: hostsRegex,
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
      hosts: hostsRegex,
      path: '/redirect',
      params: ['url'],
    })
    const url = new URL('https://other.com/redirect?url=https%3A%2F%2Ftarget.com')

    expect(extractor(url)).toBeUndefined()
  })
})
