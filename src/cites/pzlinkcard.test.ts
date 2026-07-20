import { describe, expect, it } from 'bun:test'
import { baseContext, citeExtractor, describeForEachParser, html } from '../tests.js'
import { convertCiteCards } from '../transforms/dom/convertCiteCards.js'
import type { CiteResolverResult, TransformContext } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { pzlinkcardCiteResolver } from './pzlinkcard.js'

describeForEachParser('pzlinkcardCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, pzlinkcardCiteResolver)

  // Which element gets replaced only exists in the document once the transform runs, so
  // extracting from a parsed element cannot see the wrapping anchor being swapped out.
  const transform = (value: string) => {
    const context: TransformContext = { ...baseContext, citeResolvers: [pzlinkcardCiteResolver] }

    return applyDomTransforms(parseHtml(value), [convertCiteCards(context)])
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <a href="https://example.com/page" target="_blank" rel="external noopener">
          <div class="lkc-card">
            <div class="lkc-info">
              <img class="lkc-favicon" src="https://www.google.com/s2/favicons?domain=example.com" alt="" width="16" height="16" />
              <div class="lkc-domain">example.com</div>
              <div class="lkc-share">
                <div class="lkc-sns-fb">12 Shares</div>
                <div class="lkc-sns-hb">10 Users</div>
              </div>
            </div>
            <div class="lkc-content">
              <figure class="lkc-thumbnail"><img class="lkc-thumbnail-img" src="https://cdn.example.com/thumb.jpg" alt="" /></figure>
              <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
              <div class="lkc-excerpt">Preview text</div>
            </div>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'pzlinkcard',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://www.google.com/s2/favicons?domain=example.com',
        thumbnail: 'https://cdn.example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the wrapping url and title are present', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'pzlinkcard',
        url: 'https://example.com/page',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the favicon when the class sits on a wrapper around the image', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-info">
              <div class="lkc-favicon">
                <img src="https://www.google.com/s2/favicons?domain=example.com" alt="" width="16" height="16" />
              </div>
              <div class="lkc-domain">example.com</div>
            </div>
            <div class="lkc-content"><div class="lkc-title">Page title</div></div>
          </div>
        </a>
      `

      expect((await extract(value))?.icon).toBe(
        'https://www.google.com/s2/favicons?domain=example.com',
      )
    })

    it('should read the printed url when the card has no wrapping anchor', async () => {
      const value = html`
        <div class="lkc-card">
          <div class="lkc-content">
            <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
            <div class="lkc-url"><strike>https://example.com/page</strike></div>
          </div>
        </div>
      `

      expect((await extract(value))?.url).toBe('https://example.com/page')
    })

    it('should prefer the wrapping anchor over the printed url', async () => {
      const value = html`
        <a href="https://example.com/anchor">
          <div class="lkc-card">
            <div class="lkc-content">
              <div class="lkc-title">Page title</div>
              <div class="lkc-url"><strike>https://example.com/printed</strike></div>
            </div>
          </div>
        </a>
      `

      expect((await extract(value))?.url).toBe('https://example.com/anchor')
    })

    it('should fall back to the title container when the title-text element is absent', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-title">Page title</div>
          </div>
        </a>
      `

      expect((await extract(value))?.title).toBe('Page title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when there is no wrapping link', async () => {
      const value = html`
        <div class="lkc-card">
          <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-excerpt">Preview text</div>
          </div>
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('through convertCiteCards', () => {
    it('should replace the wrapping anchor along with the card', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
          </div>
        </a>
      `
      const expected = html`
        <div
          data-cite-title="Page title"
          data-cite-url="https://example.com/page"
          data-cite-provider="pzlinkcard"
        >
          <a href="https://example.com/page">Page title</a>
        </div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should emit one placeholder per card', async () => {
      const value = html`
        <a href="https://example.com/one">
          <div class="lkc-card"><div class="lkc-title">One</div></div>
        </a>
        <div class="lkc-card">
          <div class="lkc-title">Two</div>
          <div class="lkc-url">https://example.com/two</div>
        </div>
      `
      const result = await transform(value)

      expect((result.match(/data-cite-provider="/g) ?? []).length).toBe(2)
      expect(result).not.toContain('class="lkc-card"')
    })

    it('should leave an anchor that wraps no card alone', async () => {
      const value = '<a href="https://example.com/page">Plain link</a>'

      expect(await transform(value)).toEqualHtml(value)
    })

    // The nested anchor this fixes only misbehaves once the output is reparsed, which is
    // what a second run does — so this is the case that pins the bug staying fixed.
    it('should be idempotent', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card"><div class="lkc-title">Page title</div></div>
        </a>
      `
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })
})
