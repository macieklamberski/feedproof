import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { embedlyCiteResolver } from './embedly.js'

describeForEachParser('embedlyCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, embedlyCiteResolver)

  describe('happy paths', () => {
    it('should extract url, title and description', async () => {
      const value = html`
        <blockquote class="embedly-card" data-card-controls="0">
          <h4><a href="https://example.com/docs">Documentation</a></h4>
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
          <h4><a href="https://example.com/page">Page title</a></h4>
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
      const value = html`<a href="https://example.com/page" class="embedly-card">Page title</a>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the anchor has no href', async () => {
      const value = html`
        <blockquote class="embedly-card">
          <h4><a>Page title</a></h4>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no title', async () => {
      const value = html`
        <blockquote class="embedly-card">
          <h4><a href="https://example.com/page"></a></h4>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
