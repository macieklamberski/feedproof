import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { buddybossCiteResolver } from './buddyboss.js'

describeForEachParser('buddybossCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, buddybossCiteResolver)

  describe('happy paths', () => {
    it('should extract every field from a complete preview', async () => {
      const value = html`
        <div class="bb-link-preview-container">
          <div class="bb-link-preview-image">
            <div class="bb-link-preview-image-cover">
              <a href="https://example.com/calculator" target="_blank"><img src="https://example.com/opengraph-image" /></a>
            </div>
          </div>
          <div class="bb-link-preview-info">
            <p class="bb-link-preview-link-name">example.com</p>
            <p class="bb-link-preview-title"><a href="https://example.com/calculator" target="_blank" rel="nofollow">Gold Calculator &mdash; Live Price by Karat</a></p>
            <div class="bb-link-preview-excerpt"><p>Free gold price calculator. Updated regularly.</p></div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'buddyboss',
        url: 'https://example.com/calculator',
        title: 'Gold Calculator — Live Price by Karat',
        description: 'Free gold price calculator. Updated regularly.',
        publisher: 'example.com',
        thumbnail: 'https://example.com/opengraph-image',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the optional fields undefined when only the title link is present', async () => {
      const value = html`
        <div class="bb-link-preview-container">
          <div class="bb-link-preview-info">
            <p class="bb-link-preview-title"><a href="https://example.com/calculator">Gold Calculator</a></p>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'buddyboss',
        url: 'https://example.com/calculator',
        title: 'Gold Calculator',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no link is present', async () => {
      const value = html`
        <div class="bb-link-preview-container">
          <div class="bb-link-preview-info">
            <p class="bb-link-preview-title">Gold Calculator</p>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no title', async () => {
      const value = html`
        <div class="bb-link-preview-container">
          <div class="bb-link-preview-image">
            <a href="https://example.com/calculator"><img src="https://example.com/opengraph-image" /></a>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The preview sits after the post's own paragraphs and the like button, so the pipeline is
// what shows it becoming one placeholder while the text around it survives.
describeForEachParser('buddyboss preview through the pipeline', (parseHtml) => {
  it('should convert the preview into a cite placeholder', async () => {
    const value = html`
      <p>One thing that often gets mixed together here is bullion versus jewelry.</p>
      <div class="bb-link-preview-container">
        <div class="bb-link-preview-image">
          <div class="bb-link-preview-image-cover">
            <a href="https://example.com/calculator" target="_blank"><img src="https://example.com/opengraph-image" /></a>
          </div>
        </div>
        <div class="bb-link-preview-info">
          <p class="bb-link-preview-link-name">example.com</p>
          <p class="bb-link-preview-title"><a href="https://example.com/calculator" target="_blank" rel="nofollow">Gold Calculator</a></p>
          <div class="bb-link-preview-excerpt"><p>Free gold price calculator.</p></div>
        </div>
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })
    const expected = html`
      <p>One thing that often gets mixed together here is bullion versus jewelry.</p>
      <div
        data-cite-provider="buddyboss"
        data-cite-description="Free gold price calculator."
        data-cite-publisher="example.com"
        data-cite-url="https://example.com/calculator"
        data-cite-title="Gold Calculator"
        data-cite-thumbnail="https://example.com/opengraph-image"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
