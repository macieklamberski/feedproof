import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { normalizeAnchoredHeadings } from './normalizeAnchoredHeadings.js'

const samePageContext: TransformContext = {
  ...baseContext,
  baseUrl: 'https://thu-le.com/blog/how-i-track-my-finances',
}

describeForEachParser('normalizeAnchoredHeadings', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [normalizeAnchoredHeadings(context)])
  }

  describe('symbol-only permalinks', () => {
    it('should strip a trailing "#" glyph and set the heading id', async () => {
      const value = '<h2>The system<a href="#the-system">#</a></h2>'
      const expected = '<h2 id="the-system">The system</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should strip a pilcrow glyph and keep the existing id', async () => {
      const value = '<h2 id="s">Section<a href="#s" class="headerlink" title="Permalink">¶</a></h2>'
      const expected = '<h2 id="s">Section</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should treat a zero-width-space anchor body as empty', async () => {
      const value = '<h2 id="whats-new">What\'s New<a href="#whats-new" class="hash-link">​</a></h2>'
      const expected = '<h2 id="whats-new">What\'s New</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a GitHub octicon anchor (empty text, svg glyph)', async () => {
      const value =
        '<h2 id="intro"><a class="anchor" aria-hidden="true" href="#intro"><svg class="octicon octicon-link"></svg></a>Intro</h2>'
      const expected = '<h2 id="intro">Intro</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove an empty generator anchor (headerlink) and keep the id', async () => {
      const value =
        '<h2 id="the-sample"><a href="#the-sample" class="headerlink" title="The Sample"></a>The Sample</h2>'
      const expected = '<h2 id="the-sample">The Sample</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('whole-heading links', () => {
    it('should unwrap a bare-fragment heading link and set the id', async () => {
      const value = '<h2><a href="#json-api">JSON API</a></h2>'
      const expected = '<h2 id="json-api">JSON API</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should normalize an absolute same-page link when baseUrl matches', async () => {
      const value =
        '<h2><a href="https://thu-le.com/blog/how-i-track-my-finances#the-system" target="_blank" rel="noopener">The system</a></h2>'
      const expected = '<h2 id="the-system">The system</h2>'

      expect(await transform(value, samePageContext)).toEqualHtml(expected)
    })

    it('should leave an off-page link untouched even when the slug matches', async () => {
      const value =
        '<h2><a href="https://thu-le.com/blog/other-post#the-system">The system</a></h2>'

      expect(await transform(value, samePageContext)).toEqualHtml(value)
    })

    it('should preserve surrounding markup when promoting the text out', async () => {
      const value = '<h3><strong><a href="#setup">Setup</a></strong></h3>'
      const expected = '<h3 id="setup"><strong>Setup</strong></h3>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop an inline #fragment glyph span and keep the title', async () => {
      const value =
        '<h2 id="utility"><a href="#utility">Utility<span class="anchor">#utility</span></a></h2>'
      const expected = '<h2 id="utility">Utility</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should treat an anchor holding only a #fragment glyph as symbol-only', async () => {
      const value =
        '<h2 id="intro">Intro<a href="#intro"><span class="anchor">#intro</span></a></h2>'
      const expected = '<h2 id="intro">Intro</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('excluded anchors', () => {
    it('should leave a footnote reference wrapped in <sup>', async () => {
      const value = '<h2>Title<sup><a href="#fn1">1</a></sup></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an anchor with a footnote class', async () => {
      const value = '<h2>Title <a href="#footnote_1" class="footnote-link">1</a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an anchor whose text is a bracketed numeral', async () => {
      const value = '<h6><a href="http://example.com/post#_ftnref40">[40]</a> Ibid</h6>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a heading link with no fragment', async () => {
      const value = '<h2><a href="https://example.com/post">Post Title</a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a partial fragment link that is not self-referential', async () => {
      const value = '<h3>See <a href="#other-section">other section</a> below</h3>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a JS toggle whose fragment does not match the heading', async () => {
      const value = '<h2><a href="#new_category" class="toggler">Create New Category</a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an accordion control even when its fragment matches the title', async () => {
      const value =
        '<h3 class="wpb_accordion_header ui-accordion-header"><a href="#what-is-x">What is X</a></h3>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a WPBakery tab control (data-vc-accordion attribute)', async () => {
      const value =
        '<h4 class="vc_tta-panel-title"><a href="#manifesto" data-vc-accordion>Manifesto</a></h4>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a disclosure button (role + aria-expanded)', async () => {
      const value = '<h4><a href="#section" role="button" aria-expanded="false">Section</a></h4>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('baseUrl handling', () => {
    it('should normalize a bare-fragment link without a baseUrl', async () => {
      const value = '<h2><a href="#the-system">The system</a></h2>'
      const expected = '<h2 id="the-system">The system</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an absolute link untouched when no baseUrl is set', async () => {
      const value =
        '<h2><a href="https://thu-le.com/blog/how-i-track-my-finances#the-system">The system</a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an absolute link untouched when the base URL does not resolve', async () => {
      const value = '<h2><a href="https://example.com/post#intro">Intro</a></h2>'
      const context: TransformContext = {
        ...baseContext,
        baseUrl: 'not-a-url',
        resolveUrlFn: (_url, base) => (base === undefined ? undefined : 'https://example.com/post'),
      }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should leave an absolute link untouched when resolution yields an invalid URL', async () => {
      const value = '<h2><a href="https://example.com/post#intro">Intro</a></h2>'
      const context: TransformContext = {
        ...baseContext,
        baseUrl: 'https://example.com/post',
        resolveUrlFn: () => '::',
      }

      expect(await transform(value, context)).toEqualHtml(value)
    })
  })

  describe('multiple anchors in one heading', () => {
    it('should set the id from the permalink and leave a real content link', async () => {
      const value =
        '<h2><a href="https://example.com/x">External</a> <a href="#section" class="headerlink"></a></h2>'
      const expected = '<h2 id="section"><a href="https://example.com/x">External</a> </h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <h2>The system<a href="#the-system">#</a></h2>
      <h3 id="setup"><a href="#setup" class="headerlink"></a>Setup</h3>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
