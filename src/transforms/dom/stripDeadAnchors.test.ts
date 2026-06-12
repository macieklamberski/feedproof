import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripDeadAnchors } from './stripDeadAnchors.js'

describeForEachParser('stripDeadAnchors', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripDeadAnchors(context)])
  }

  it('should unwrap anchor with empty href', async () => {
    const value = '<p><a href="">click me</a></p>'
    const expected = '<p>click me</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap anchor with whitespace-only href', async () => {
    const value = '<p><a href="   ">click me</a></p>'
    const expected = '<p>click me</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap anchor with bare hash href', async () => {
    const value = '<p><a href="#">jump</a></p>'
    const expected = '<p>jump</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap anchor with javascript: scheme', async () => {
    const value = '<p><a href="javascript:void(0)">action</a></p>'
    const expected = '<p>action</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap anchor with javascript: scheme regardless of case', async () => {
    const value = '<p><a href="JavaScript:doStuff()">action</a></p>'
    const expected = '<p>action</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap anchor with javascript: scheme that has leading whitespace', async () => {
    const value = '<p><a href=" javascript:void(0)">action</a></p>'
    const expected = '<p>action</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve anchor with fragment href pointing to a section', async () => {
    const value = '<p><a href="#section">jump</a></p>'

    expect(await transform(value)).toContain('<a href="#section">jump</a>')
  })

  it('should preserve anchor with absolute http href', async () => {
    const value = '<p><a href="https://example.com">link</a></p>'

    expect(await transform(value)).toContain('<a href="https://example.com">link</a>')
  })

  it('should preserve anchor with mailto: href', async () => {
    const value = '<p><a href="mailto:hi@example.com">email</a></p>'

    expect(await transform(value)).toContain('<a href="mailto:hi@example.com">email</a>')
  })

  it('should preserve anchor without href attribute (named anchor target)', async () => {
    const value = '<p><a id="top">top</a></p>'

    expect(await transform(value)).toContain('<a id="top">top</a>')
  })

  it('should preserve anchor with name attribute and no href (legacy target)', async () => {
    const value = '<p><a name="top">top</a></p>'

    expect(await transform(value)).toContain('<a name="top">top</a>')
  })

  it('should preserve nested children when unwrapping', async () => {
    const value = '<p><a href="#"><span>boxed</span><strong>bold</strong></a></p>'
    const expected = '<p><span>boxed</span><strong>bold</strong></p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve image inside dead anchor', async () => {
    const value = '<a href="javascript:void(0)"><img src="x.jpg"></a>'
    const result = await transform(value)

    expect(result).toContain('<img src="x.jpg">')
    expect(result).not.toContain('<a ')
  })

  it('should remove empty dead anchors entirely', async () => {
    const value = '<p>before<a href="#"></a>after</p>'
    const expected = '<p>beforeafter</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should leave non-anchor content untouched', async () => {
    const value = '<p>before <a href="#">dead</a> after <a href="https://example.com">live</a></p>'
    const result = await transform(value)

    expect(result).toContain('before dead after')
    expect(result).toContain('<a href="https://example.com">live</a>')
  })

  it('should handle multiple dead anchors in one document', async () => {
    const value = '<p><a href="#">a</a> <a href="javascript:x">b</a> <a href="">c</a></p>'
    const expected = '<p>a b c</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not affect anchors with hash followed by query/path', async () => {
    const value = '<a href="#!/path">spa link</a>'

    expect(await transform(value)).toContain('<a href="#!/path">spa link</a>')
  })

  it('should preserve anchor with id even when href is dead', async () => {
    // The anchor is a fragment target referenced elsewhere — unwrapping it
    // would break all in-page navigation pointing at #section1.
    const value = html`
      <a id="section1" href="#"></a>
      <p>body</p>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve anchor with name attribute even when href is dead', async () => {
    const value = '<a name="footnote1" href="javascript:void(0)">F1</a>'

    expect(await transform(value)).toBe(value)
  })

  it('should still unwrap anchor with id when href is alive (id is irrelevant)', async () => {
    const value = '<a id="x" href="https://example.com">live</a>'

    expect(await transform(value)).toBe(value)
  })

  it('should be idempotent', async () => {
    const value = '<p><a href="">click me</a></p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
