import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { unwrapWrappers } from './unwrapWrappers.js'

describeForEachParser('unwrapWrappers', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [unwrapWrappers(context)])
  }

  it('should unwrap a single bare div wrapper', async () => {
    const value = '<div><p>Content</p></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap nested bare wrappers', async () => {
    const value = '<div><article><p>Content</p></article></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap section and main wrappers', async () => {
    const value = '<section><main><p>Content</p></main></section>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap wrapper with attributes', async () => {
    const value = '<div class="content"><p>Content</p></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap wrapper with multiple attributes', async () => {
    const value = '<div class="page" id="readability-page-1"><p>Content</p></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap wrapper with attribute values containing > characters', async () => {
    // Tailwind-style arbitrary-value selectors contain `>` inside the class
    // attribute. The old regex misparsed this; the DOM version handles it
    // correctly because linkedom parses attribute values as one unit.
    const value =
      '<section class="[&amp;:has([data-x])>*]:pointer-events-auto"><p>Article</p></section>'
    const expected = '<p>Article</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap sibling wrappers independently', async () => {
    // The transform is positioned AFTER list/pre merges in the default
    // pipeline, so unwrapping sibling wrappers does not cascade into merging
    // the now-adjacent inner elements.
    const value = '<div><p>First</p></div><div><p>Second</p></div>'
    const expected = '<p>First</p><p>Second</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not unwrap non-wrapper tags', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should unwrap nested wrappers with attributes', async () => {
    const value = '<div><div id="root"><p>Content</p></div></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap a wrapper even when it has text siblings', async () => {
    const value = 'lead text<div><p>Content</p></div>'
    const expected = 'lead text<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should remove empty wrapper entirely', async () => {
    const value = '<div></div>'
    const expected = ''

    expect(await transform(value)).toBe(expected)
  })

  it('should handle empty string', async () => {
    expect(await transform('')).toBe('')
  })

  it('should handle plain text without tags', async () => {
    const value = 'Just text'

    expect(await transform(value)).toBe(value)
  })

  it('should ignore HTML comments and still unwrap the wrapper', async () => {
    const value = '<!-- preserved --><div><p>Content</p></div>'
    const expected = '<!-- preserved --><p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap a div wrapper inside <figure> around media', async () => {
    const value = '<figure><div><img src="x.jpg"></div></figure>'
    const expected = '<figure><img src="x.jpg"></figure>'

    expect(await transform(value)).toBe(expected)
  })

  it('should collapse deeply nested div wrappers inside <figure>', async () => {
    const value = '<figure><div><div><img src="x.jpg"></div></div></figure>'
    const expected = '<figure><img src="x.jpg"></figure>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap a div inside <figcaption>', async () => {
    const value = '<figure><img src="x.jpg"><figcaption><div>caption</div></figcaption></figure>'
    const expected = '<figure><img src="x.jpg"><figcaption>caption</figcaption></figure>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap a div between an anchor and its sole media child (Substack)', async () => {
    const value =
      '<figure><a href="x"><div><picture></picture></div></a><figcaption>cap</figcaption></figure>'
    const expected =
      '<figure><a href="x"><picture></picture></a><figcaption>cap</figcaption></figure>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve a div carrying data-embed attributes', async () => {
    const value =
      '<div data-embed-src="https://example.com/x"><a href="https://example.com/x">https://example.com/x</a></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve a div carrying data-bookmark attributes', async () => {
    const value =
      '<div data-bookmark-provider="ghost" data-bookmark-url="https://example.com/x"><a href="https://example.com/x">Title</a></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve a div carrying a data-table attribute', async () => {
    const value = '<div data-table=""><table><tbody><tr><td>Cell</td></tr></tbody></table></div>'

    expect(await transform(value)).toBe(value)
  })
})
