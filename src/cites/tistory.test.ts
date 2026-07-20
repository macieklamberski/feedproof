import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { tistoryCiteResolver } from './tistory.js'

describeForEachParser('tistoryCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, tistoryCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <figure
          class="opengraph"
          data-ke-type="opengraph"
          data-og-type="product"
          data-og-title="Page title"
          data-og-description="Preview text"
          data-og-host="example.com"
          data-og-source-url="https://short.example.com/e/abc"
          data-og-url="https://example.com/item/1"
          data-og-image="https://cdn.example.com/thumb.jpg"
        >
          <a href="https://short.example.com/e/abc" target="_blank" rel="noopener" data-source-url="https://short.example.com/e/abc">
            <div class="og-image" style="background-image: url('https://cdn.example.com/thumb.jpg');">&nbsp;</div>
            <div class="og-text">
              <p class="og-title" data-ke-size="size16">Page title</p>
              <p class="og-desc" data-ke-size="size16">Preview text</p>
              <p class="og-host" data-ke-size="size16">example.com</p>
            </div>
          </a>
        </figure>
      `
      const expected: CiteResolverResult = {
        provider: 'tistory',
        url: 'https://short.example.com/e/abc',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        thumbnail: 'https://cdn.example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the fields from the inner elements when the attributes are absent', async () => {
      const value = html`
        <figure data-og-source-url="https://example.com/post">
          <a href="https://example.com/post">
            <div class="og-text">
              <p class="og-title">Page title</p>
              <p class="og-desc">Preview text</p>
              <p class="og-host">example.com</p>
            </div>
          </a>
        </figure>
      `
      const expected: CiteResolverResult = {
        provider: 'tistory',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should take the first image when several are listed', async () => {
      const value = html`
        <figure
          data-og-source-url="https://example.com/post"
          data-og-title="Page title"
          data-og-image="https://cdn.example.com/a.jpg,https://cdn.example.com/b.jpg,https://cdn.example.com/c.jpg"
        ></figure>
      `

      expect((await extract(value))?.thumbnail).toBe('https://cdn.example.com/a.jpg')
    })

    it('should prefer the source url over the canonical url', async () => {
      const value = html`
        <figure
          data-og-source-url="https://short.example.com/e/abc"
          data-og-url="https://example.com/item/1"
          data-og-title="Page title"
        ></figure>
      `

      expect((await extract(value))?.url).toBe('https://short.example.com/e/abc')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <figure data-og-source-url="https://example.com/post" data-og-title=" Padded title "></figure>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no title is available', async () => {
      const value = html`
        <figure data-og-source-url="https://example.com/post" data-og-description="Preview text"></figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = html`
        <figure data-og-source-url="https://example.com/post" data-og-title=" "></figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match an element without a source url', async () => {
      const value = html`
        <figure data-ke-type="opengraph" data-og-title="Page title"></figure>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
