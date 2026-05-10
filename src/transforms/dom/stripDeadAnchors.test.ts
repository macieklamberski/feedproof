import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import type { TransformContext } from '../../types.js'
import { stripDeadAnchors } from './stripDeadAnchors.js'

const context: TransformContext = {}

describe('stripDeadAnchors', () => {
  const strip = (html: string) => {
    return transformHtml(html, stripDeadAnchors(context))
  }

  it('should unwrap anchor with empty href', () => {
    const result = strip('<p><a href="">click me</a></p>')

    expect(result).toBe('<p>click me</p>')
  })

  it('should unwrap anchor with whitespace-only href', () => {
    const result = strip('<p><a href="   ">click me</a></p>')

    expect(result).toBe('<p>click me</p>')
  })

  it('should unwrap anchor with bare hash href', () => {
    const result = strip('<p><a href="#">jump</a></p>')

    expect(result).toBe('<p>jump</p>')
  })

  it('should unwrap anchor with javascript: scheme', () => {
    const result = strip('<p><a href="javascript:void(0)">action</a></p>')

    expect(result).toBe('<p>action</p>')
  })

  it('should unwrap anchor with javascript: scheme regardless of case', () => {
    const result = strip('<p><a href="JavaScript:doStuff()">action</a></p>')

    expect(result).toBe('<p>action</p>')
  })

  it('should unwrap anchor with javascript: scheme that has leading whitespace', () => {
    const result = strip('<p><a href=" javascript:void(0)">action</a></p>')

    expect(result).toBe('<p>action</p>')
  })

  it('should preserve anchor with fragment href pointing to a section', () => {
    const result = strip('<p><a href="#section">jump</a></p>')

    expect(result).toContain('<a href="#section">jump</a>')
  })

  it('should preserve anchor with absolute http href', () => {
    const result = strip('<p><a href="https://example.com">link</a></p>')

    expect(result).toContain('<a href="https://example.com">link</a>')
  })

  it('should preserve anchor with mailto: href', () => {
    const result = strip('<p><a href="mailto:hi@example.com">email</a></p>')

    expect(result).toContain('<a href="mailto:hi@example.com">email</a>')
  })

  it('should preserve anchor without href attribute (named anchor target)', () => {
    const result = strip('<p><a id="top">top</a></p>')

    expect(result).toContain('<a id="top">top</a>')
  })

  it('should preserve anchor with name attribute and no href (legacy target)', () => {
    const result = strip('<p><a name="top">top</a></p>')

    expect(result).toContain('<a name="top">top</a>')
  })

  it('should preserve nested children when unwrapping', () => {
    const result = strip('<p><a href="#"><span>boxed</span><strong>bold</strong></a></p>')

    expect(result).toBe('<p><span>boxed</span><strong>bold</strong></p>')
  })

  it('should preserve image inside dead anchor', () => {
    const result = strip('<a href="javascript:void(0)"><img src="x.jpg"></a>')

    expect(result).toContain('<img src="x.jpg">')
    expect(result).not.toContain('<a ')
  })

  it('should remove empty dead anchors entirely', () => {
    const result = strip('<p>before<a href="#"></a>after</p>')

    expect(result).toBe('<p>beforeafter</p>')
  })

  it('should leave non-anchor content untouched', () => {
    const result = strip('<p>before <a href="#">dead</a> after <a href="https://example.com">live</a></p>')

    expect(result).toContain('before dead after')
    expect(result).toContain('<a href="https://example.com">live</a>')
  })

  it('should handle multiple dead anchors in one document', () => {
    const result = strip('<p><a href="#">a</a> <a href="javascript:x">b</a> <a href="">c</a></p>')

    expect(result).toBe('<p>a b c</p>')
  })

  it('should not affect anchors with hash followed by query/path', () => {
    const result = strip('<a href="#!/path">spa link</a>')

    expect(result).toContain('<a href="#!/path">spa link</a>')
  })
})
