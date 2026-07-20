import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { embedlyCiteResolver } from './embedly.js'

describeForEachParser('embedlyCiteResolver', (parseHtml) => {
  const extract = async (value: string): Promise<CiteResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(embedlyCiteResolver.selector)
    return element ? await embedlyCiteResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract url, title and description from the blockquote form', async () => {
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

    it('should extract url and title from the bare anchor form', async () => {
      const value = html`<a href="https://example.com/page" class="embedly-card">Page title</a>`
      const expected: CiteResolverResult = {
        provider: 'embedly',
        url: 'https://example.com/page',
        title: 'Page title',
        description: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave the description undefined for a blockquote without a paragraph', async () => {
      const value = html`
        <blockquote class="embedly-card">
          <h4><a href="https://example.com/page">Page title</a></h4>
        </blockquote>
      `

      expect((await extract(value))?.description).toBeUndefined()
    })

    it('should trim surrounding whitespace from the anchor title', async () => {
      const value = html`<a href="https://example.com/page" class="embedly-card"> Padded title </a>`

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the anchor has no href', async () => {
      const value = html`<a class="embedly-card">Page title</a>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no title', async () => {
      const value = html`<a href="https://example.com/page" class="embedly-card"></a>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})
