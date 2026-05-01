import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { unwrapRedirectUrls } from './unwrapRedirectUrls.js'

const context: TransformContext = {}

describe('unwrapRedirectUrls', () => {
  it('should unwrap Google redirect with url param', () => {
    const html =
      '<a href="https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Fpage">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://example.com/page"')
    expect(result).not.toContain('google.com')
  })

  it('should unwrap Google redirect with q param', () => {
    const html = '<a href="https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fpage">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://example.com/page"')
    expect(result).not.toContain('google.com')
  })

  it('should prefer url param over q param', () => {
    const html =
      '<a href="https://www.google.com/url?url=https%3A%2F%2Freal.com&q=https%3A%2F%2Fwrong.com">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://real.com"')
    expect(result).not.toContain('wrong.com')
  })

  it('should not unwrap non-redirect Google URLs', () => {
    const html = '<a href="https://www.google.com/search?q=test">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://www.google.com/search?q=test"')
  })

  it('should not unwrap when target param is missing', () => {
    const html = '<a href="https://www.google.com/url?sa=t&source=web">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://www.google.com/url?sa=t&source=web"')
  })

  it('should not modify non-Google links', () => {
    const html = '<a href="https://example.com/page?url=https%3A%2F%2Fother.com">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://example.com/page?url=https%3A%2F%2Fother.com"')
  })

  it('should handle multiple links with mixed redirect and normal', () => {
    const html = [
      '<a href="https://www.google.com/url?url=https%3A%2F%2Fexample.com">redirect</a>',
      '<a href="https://example.com/normal">normal</a>',
    ].join('')
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('href="https://example.com/normal"')
    expect(result).not.toContain('google.com')
  })

  it('should handle invalid URLs gracefully', () => {
    const html = '<a href="not-a-valid-url">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="not-a-valid-url"')
  })

  it('should unwrap Facebook link shim with l.facebook.com', () => {
    const html =
      '<a href="https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fpage">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://example.com/page"')
    expect(result).not.toContain('facebook.com')
  })

  it('should unwrap Facebook link shim with lm.facebook.com', () => {
    const html =
      '<a href="https://lm.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fpage">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://example.com/page"')
    expect(result).not.toContain('facebook.com')
  })

  it('should not unwrap non-shim Facebook URLs', () => {
    const html = '<a href="https://www.facebook.com/profile">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('href="https://www.facebook.com/profile"')
  })

  it('should handle links without href', () => {
    const html = '<a name="anchor">link</a>'
    const result = transformHtml(html, unwrapRedirectUrls(context))

    expect(result).toContain('<a name="anchor">')
  })
})
