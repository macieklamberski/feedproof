import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { normalizeAnchoredHeadings } from './normalizeAnchoredHeadings.js'

const samePageContext: TransformContext = {
  ...baseContext,
  baseUrl: 'https://thu-le.com/blog/how-i-track-my-finances',
}

describeForEachParser('normalizeAnchoredHeadings', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [normalizeAnchoredHeadings(context)])
  }

  describe('symbol-only permalinks', () => {
    it('should replace a trailing "#" glyph with a permalink anchor', async () => {
      const value = '<h2>The system<a href="#the-system">#</a></h2>'
      const expected = '<h2><a id="the-system" href="#the-system"></a>The system</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace a pilcrow glyph, reusing the existing id', async () => {
      const value = '<h2 id="s">Section<a href="#s" class="headerlink" title="Permalink">¶</a></h2>'
      const expected = '<h2><a id="s" href="#s"></a>Section</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should treat a zero-width-space anchor body as empty', async () => {
      const value = '<h2 id="whats-new">What\'s New<a href="#whats-new" class="hash-link">​</a></h2>'
      const expected = '<h2><a id="whats-new" href="#whats-new"></a>What\'s New</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a GitHub octicon anchor (empty text, svg glyph)', async () => {
      const value = html`
        <h2 id="intro">
          <a class="anchor" aria-hidden="true" href="#intro">
            <svg class="octicon octicon-link"></svg>
          </a>Intro</h2>
      `
      const expected = '<h2><a id="intro" href="#intro"></a>Intro</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should normalize an empty generator anchor (headerlink)', async () => {
      const value = html`
        <h2
          id="the-sample"
        ><a href="#the-sample" class="headerlink" title="The Sample"></a>The Sample</h2>
      `
      const expected = '<h2><a id="the-sample" href="#the-sample"></a>The Sample</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should treat a run of hashes ("##") as a permalink glyph', async () => {
      const value = '<h2>Alternatives<a href="#alternatives" class="anchor">##</a></h2>'
      const expected = '<h2><a id="alternatives" href="#alternatives"></a>Alternatives</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('generator permalink classes', () => {
    const cases: Array<[string, string, string]> = [
      [
        'heading-anchor',
        '<h2>In summary<a href="#in-summary" class="heading-anchor">#</a></h2>',
        '<h2><a id="in-summary" href="#in-summary"></a>In summary</h2>',
      ],
      [
        'heading-link',
        '<h2>Applications<a href="#applications" class="heading-link"></a></h2>',
        '<h2><a id="applications" href="#applications"></a>Applications</h2>',
      ],
      [
        'heading-mark',
        '<h1><a href="#install" class="heading-mark"></a>Install</h1>',
        '<h1><a id="install" href="#install"></a>Install</h1>',
      ],
      [
        'o-heading-link',
        '<h2>Images<a class="o-heading-link" href="#images">#</a></h2>',
        '<h2><a id="images" href="#images"></a>Images</h2>',
      ],
      [
        'wiki-anchor',
        '<h2>Changes<a class="wiki-anchor" href="#changes">¶</a></h2>',
        '<h2><a id="changes" href="#changes"></a>Changes</h2>',
      ],
      [
        'permalink',
        '<h2>The Budget<a class="permalink" href="#the-budget">#</a></h2>',
        '<h2><a id="the-budget" href="#the-budget"></a>The Budget</h2>',
      ],
    ]

    for (const [name, value, expected] of cases) {
      it(`should normalize a "${name}" permalink anchor`, async () => {
        expect(await transform(value)).toEqualHtml(expected)
      })
    }

    it('should match a permalink class case-insensitively', async () => {
      const value = '<h2><a href="#setup" class="Heading-Link"></a>Setup</h2>'
      const expected = '<h2><a id="setup" href="#setup"></a>Setup</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop a labelled permalink marker without leaking its text into the heading', async () => {
      const value = '<h2>Section<a class="permalink" href="#totally-different">link</a></h2>'
      const expected = '<h2><a id="totally-different" href="#totally-different"></a>Section</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('whole-heading links', () => {
    it('should unwrap a bare-fragment heading link into a permalink anchor', async () => {
      const value = '<h2><a href="#json-api">JSON API</a></h2>'
      const expected = '<h2><a id="json-api" href="#json-api"></a>JSON API</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should normalize an absolute same-page link when baseUrl matches', async () => {
      const value = html`
        <h2>
          <a
            href="https://thu-le.com/blog/how-i-track-my-finances#the-system"
            target="_blank"
            rel="noopener"
          >The system</a>
        </h2>
      `
      const expected = '<h2><a id="the-system" href="#the-system"></a>The system</h2>'

      expect(await transform(value, samePageContext)).toEqualHtml(expected)
    })

    it('should leave an off-page link untouched even when the slug matches', async () => {
      const value = html`
        <h2>
          <a href="https://thu-le.com/blog/other-post#the-system">The system</a>
        </h2>
      `

      expect(await transform(value, samePageContext)).toEqualHtml(value)
    })

    it('should preserve surrounding markup when promoting the text out', async () => {
      const value = '<h3><strong><a href="#setup">Setup</a></strong></h3>'
      const expected = '<h3><a id="setup" href="#setup"></a><strong>Setup</strong></h3>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop an inline #fragment glyph span and keep the title', async () => {
      const value = html`
        <h2 id="utility">
          <a href="#utility">Utility<span class="anchor">#utility</span>
          </a>
        </h2>
      `
      const expected = '<h2><a id="utility" href="#utility"></a>Utility</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should treat an anchor holding only a #fragment glyph as symbol-only', async () => {
      const value = html`
        <h2 id="intro">Intro<a href="#intro">
            <span class="anchor">#intro</span>
          </a>
        </h2>
      `
      const expected = '<h2><a id="intro" href="#intro"></a>Intro</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('bare in-page targets', () => {
    it('should turn a bare <a name> target into a clickable permalink', async () => {
      const value = '<h2><a name="the-setup"></a>The Setup</h2>'
      const expected = '<h2><a id="the-setup" href="#the-setup"></a>The Setup</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should turn an empty <a id> target into a clickable permalink', async () => {
      const value = '<h3>Notes<a id="notes"></a></h3>'
      const expected = '<h3><a id="notes" href="#notes"></a>Notes</h3>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the bare target fragment even when the heading has its own id', async () => {
      const value = '<h2 id="section-2"><a name="legacy-anchor"></a>Section</h2>'
      const expected = html`
        <h2 id="section-2">
          <a id="legacy-anchor" href="#legacy-anchor"></a>Section</h2>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a named anchor that wraps real heading text', async () => {
      const value = '<h2><a name="x">Real heading text</a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a plain content link with no fragment', async () => {
      const value = '<h2><a href="https://example.com/post">Headline</a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('bare heading id', () => {
    it('should promote a heading id with no anchor to a canonical permalink', async () => {
      const value = '<h2 id="exploitation">Exploitation</h2>'
      const expected = '<h2><a id="exploitation" href="#exploitation"></a>Exploitation</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep a real content link beside the promoted permalink', async () => {
      const value = '<h3 id="refs">See <a href="https://example.com">docs</a></h3>'
      const expected = html`
        <h3>
          <a id="refs" href="#refs"></a>See <a href="https://example.com">docs</a>
        </h3>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a heading with no id and no anchor untouched', async () => {
      const value = '<h2>Plain heading</h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a heading with an empty id untouched', async () => {
      const value = '<h2 id="">Empty id</h2>'

      expect(await transform(value)).toEqualHtml(value)
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
      const value = html`
        <h3 class="wpb_accordion_header ui-accordion-header">
          <a href="#what-is-x">What is X</a>
        </h3>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a WPBakery tab control (data-vc-accordion attribute)', async () => {
      const value = html`
        <h4 class="vc_tta-panel-title">
          <a href="#manifesto" data-vc-accordion>Manifesto</a>
        </h4>
      `

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
      const expected = '<h2><a id="the-system" href="#the-system"></a>The system</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an absolute link untouched when no baseUrl is set', async () => {
      const value = html`
        <h2>
          <a href="https://thu-le.com/blog/how-i-track-my-finances#the-system">The system</a>
        </h2>
      `

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
    it('should add the permalink anchor and leave a real content link', async () => {
      const value = html`
        <h2>
          <a href="https://example.com/x">External</a> <a href="#section" class="headerlink"></a>
        </h2>
      `
      const expected = html`
        <h2>
          <a id="section" href="#section"></a>
          <a href="https://example.com/x">External</a> </h2>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <h2>The system<a href="#the-system">#</a>
      </h2>
      <h3 id="setup">
        <a href="#setup" class="headerlink"></a>Setup</h3>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
