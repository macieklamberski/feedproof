import { describe, expect, it } from 'bun:test'
import { baseContext } from '../tests.js'
import { chooseBaseUrl, resolveOrKeepUrl } from './urls.js'

describe('resolveOrKeepUrl', () => {
  const { resolveUrlFn } = baseContext

  it('should resolve a relative url against the base', () => {
    expect(resolveOrKeepUrl('/img.jpg', resolveUrlFn, 'https://example.com/post/')).toBe(
      'https://example.com/img.jpg',
    )
  })

  it('should resolve a protocol-relative url to the base scheme', () => {
    expect(resolveOrKeepUrl('//cdn.example/a.jpg', resolveUrlFn, 'https://example.com')).toBe(
      'https://cdn.example/a.jpg',
    )
  })

  it('should keep an absolute url unchanged', () => {
    expect(resolveOrKeepUrl('https://cdn.example/a.jpg', resolveUrlFn, 'https://example.com')).toBe(
      'https://cdn.example/a.jpg',
    )
  })

  it('should keep a data: url unchanged', () => {
    expect(resolveOrKeepUrl('data:image/png;base64,AAA', resolveUrlFn, 'https://example.com')).toBe(
      'data:image/png;base64,AAA',
    )
  })

  it('should keep a non-http scheme url unchanged', () => {
    expect(resolveOrKeepUrl('ftp://files.example/a.zip', resolveUrlFn, 'https://example.com')).toBe(
      'ftp://files.example/a.zip',
    )
  })

  it('should keep a relative url when there is no base', () => {
    expect(resolveOrKeepUrl('/img.jpg', resolveUrlFn, undefined)).toBe('/img.jpg')
  })

  it('should return undefined for an undefined url', () => {
    expect(resolveOrKeepUrl(undefined, resolveUrlFn, 'https://example.com')).toBeUndefined()
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

  it('should fall back to siteUrl when itemUrl is an empty string', () => {
    const value = chooseBaseUrl('', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when siteUrl is an empty string', () => {
    const value = chooseBaseUrl(null, '', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should return undefined when all inputs are empty strings', () => {
    expect(chooseBaseUrl('', '', '')).toBeUndefined()
  })

  it('should fall back to siteUrl when itemUrl is relative', () => {
    const value = chooseBaseUrl('/post/1', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })
})
