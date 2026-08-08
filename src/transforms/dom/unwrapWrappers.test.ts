import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
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

  it('should unwrap header and footer wrappers', async () => {
    const value = html`
      <header><p>Intro</p></header>
      <footer><p>Outro</p></footer>
    `
    const expected = html`
      <p>Intro</p>
      <p>Outro</p>
    `

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
    const value = html`
      <div><p>First</p></div>
      <div><p>Second</p></div>
    `
    const expected = html`
      <p>First</p>
      <p>Second</p>
    `

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
    const value = html`
      <div data-embed-src="https://example.com/x">
        <a href="https://example.com/x">https://example.com/x</a>
      </div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve a div carrying data-cite attributes', async () => {
    const value = html`
      <div data-cite-provider="ghost" data-cite-url="https://example.com/x">
        <a href="https://example.com/x">Title</a>
      </div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve a div carrying data-gallery attributes', async () => {
    const value = html`
      <div data-gallery-provider="wordpress">
        <figure><img src="https://example.com/a.jpg"></figure>
      </div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve a div carrying a data-table attribute', async () => {
    const value = '<div data-table=""><table><tbody><tr><td>Cell</td></tr></tbody></table></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve a div carrying a data-pre attribute', async () => {
    const value = '<div data-pre=""><pre>const x = 1</pre></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve a wrapper that is the target of an in-page fragment link', async () => {
    const value = html`
      <p><sup><a href="#fn-1">1</a></sup></p>
      <div class="footnote-definition" id="fn-1"><p>The note.</p></div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should still unwrap an id-bearing wrapper that no fragment link references', async () => {
    const value = '<p><a href="#other">jump</a></p><div id="fn-1"><p>The note.</p></div>'
    const expected = '<p><a href="#other">jump</a></p><p>The note.</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap a figure reduced to a lone link', async () => {
    const value = html`
      <figure class="wp-block-embed is-provider-twitter wp-block-embed-twitter">
        <div class="wp-block-embed__wrapper">
          <a href="https://twitter.com/someone/status/1234567890123456789">https://twitter.com/someone/status/1234567890123456789</a>
        </div>
      </figure>
    `
    const expected = html`
      <a href="https://twitter.com/someone/status/1234567890123456789">https://twitter.com/someone/status/1234567890123456789</a>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep a figure whose link wraps an image', async () => {
    const value = html`
      <figure><a href="https://example.com/full.jpg"><img src="https://example.com/thumb.jpg"></a></figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep a figure whose link sits next to a caption', async () => {
    const value = html`
      <figure><a href="https://example.com/post">Post</a><figcaption>A caption</figcaption></figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep a figure holding a placeholder next to its link', async () => {
    const value = html`
      <figure>
        <div data-embed-provider="youtube" data-embed-src="https://www.youtube.com/embed/abc"><a href="https://www.youtube.com/watch?v=abc">Watch</a></div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = '<div><article><p>Content</p></article></div>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
