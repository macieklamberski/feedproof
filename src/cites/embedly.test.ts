import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { embedlyCiteResolver } from './embedly.js'

describeForEachParser('embedlyCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, embedlyCiteResolver)

  describe('happy paths', () => {
    it('should extract url, title and description', async () => {
      const value = html`
        <blockquote class="embedly-card" data-card-controls="0">
          <h4>
            <a href="https://example.com/docs">Documentation</a>
          </h4>
          <p>The best documentation.</p>
        </blockquote>
      `
      const expected: CiteResolverResult = {
        provider: 'embedly',
        url: 'https://example.com/docs',
        title: 'Documentation',
        description: 'The best documentation.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave the description undefined without a paragraph', async () => {
      const value = html`
        <blockquote class="embedly-card">
          <h4>
            <a href="https://example.com/page">Page title</a>
          </h4>
        </blockquote>
      `
      const expected: CiteResolverResult = {
        provider: 'embedly',
        url: 'https://example.com/page',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The bare anchor form Embedly also emits already renders as the titled link a
    // placeholder would fall back to, and it can sit inline in a sentence.
    it('should ignore the bare anchor form', async () => {
      const value = html`
        <a
          href="https://example.com/page"
          class="embedly-card"
        >Page title</a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the anchor has no href', async () => {
      const value = html`
        <blockquote class="embedly-card">
          <h4>
            <a>Page title</a>
          </h4>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no title', async () => {
      const value = html`
        <blockquote class="embedly-card">
          <h4>
            <a href="https://example.com/page"></a>
          </h4>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The card's heading quotes the linked page's title, and a post about that page carries the
// same title itself, so with the duplicate-title pass running before the cite pass the card
// lost its heading, and the link with it, before this resolver saw it.
describeForEachParser('embedly card through the pipeline', (parseHtml) => {
  it('should keep the card whole when its title matches the article title', async () => {
    const value = html`
      <p>Congrats to both of them!</p>
      <blockquote class="embedly-card">
        <h4><a href="https://example.com/news/venture">Two Founders Launch a Venture</a></h4>
        <p>The pair announced a new company on Wednesday.</p>
      </blockquote>
      <script async src="//cdn.embedly.com/widgets/platform.js" charset="UTF-8"></script>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      articleTitle: 'Two Founders Launch a Venture',
    })
    const expected = html`
      <p>Congrats to both of them!</p>
      <div
        data-cite-provider="embedly"
        data-cite-description="The pair announced a new company on Wednesday."
        data-cite-url="https://example.com/news/venture"
        data-cite-title="Two Founders Launch a Venture"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
