import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { microformatsCiteResolver } from './microformats.js'

describeForEachParser('microformatsCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, microformatsCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete citation', async () => {
      const value = html`
        <span class="u-bookmark-of h-cite">
          <a class="u-url" href="https://example.com/post">
            <span class="p-name">Page title</span>
          </a>
          by <span class="p-author h-card"><span class="p-name">Author name</span></span>
          <details open>
            <summary>Post details</summary>
            <blockquote class="p-summary">Preview text</blockquote>
            <img class="u-featured" src="https://example.com/cover.png" loading="lazy" />
          </details>
        </span>
      `
      const expected: CiteResolverResult = {
        provider: 'microformats',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        author: 'Author name',
        thumbnail: 'https://example.com/cover.png',
        kind: 'bookmark',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract the date and the publisher of a cited article', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url" href="https://example.com/article"><span class="p-name">Article title</span></a>
          <time class="dt-published" datetime="2026-03-04T09:15:00Z">March 4, 2026</time>
          in <cite class="p-publication">The Journal</cite>
        </span>
      `
      const expected: CiteResolverResult = {
        provider: 'microformats',
        url: 'https://example.com/article',
        title: 'Article title',
        publisher: 'The Journal',
        date: '2026-03-04T09:15:00Z',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract a minimal citation with only url and name', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
        </span>
      `
      const expected: CiteResolverResult = {
        provider: 'microformats',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should not take the author url or name when the author is a nested h-card', async () => {
      const value = html`
        <span class="u-read-of h-cite">
          <a class="u-url" href="https://example.com/book"><span class="p-name">Book title</span></a>
          by
          <span class="p-author h-card">
            <a class="u-url" href="https://example.com/author"><span class="p-name">Author name</span></a>
          </span>
        </span>
      `
      const expected: CiteResolverResult = {
        provider: 'microformats',
        url: 'https://example.com/book',
        title: 'Book title',
        author: 'Author name',
        kind: 'read',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the kind unset for a bare citation with no response class', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
        </span>
      `

      expect((await extract(value))?.kind).toBeUndefined()
    })

    it('should read the image from u-photo when u-featured is absent', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
          <img class="u-photo" src="https://example.com/photo.jpg" />
        </span>
      `

      expect((await extract(value))?.thumbnail).toBe('https://example.com/photo.jpg')
    })

    it('should read the description from p-content when p-summary is absent', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
          <div class="p-content">Full note text</div>
        </span>
      `

      expect((await extract(value))?.description).toBe('Full note text')
    })

    it('should read the date from the text when dt-published has no datetime attribute', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
          <span class="dt-published">2026-03-04</span>
        </span>
      `

      expect((await extract(value))?.date).toBe('2026-03-04')
    })

    it('should leave the date unset for a citation with no dt-published', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
        </span>
      `

      expect((await extract(value))?.date).toBeUndefined()
    })

    it('should take the description from e-content', async () => {
      const value = html`
        <div class="u-like-of h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
          <div class="e-content"><p>The cited post's body.</p></div>
        </div>
      `

      expect((await extract(value))?.description).toBe("The cited post's body.")
    })

    it('should prefer the summary over e-content', async () => {
      const value = html`
        <div class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
          <p class="p-summary">Short summary.</p>
          <div class="e-content"><p>The much longer body.</p></div>
        </div>
      `

      expect((await extract(value))?.description).toBe('Short summary.')
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an offline citation with no url', async () => {
      const value = html`
        <span class="h-cite">
          <cite class="p-name">A printed book</cite>
        </span>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no name', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url" href="https://example.com/post"></a>
        </span>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when only the author is present', async () => {
      const value = html`
        <span class="h-cite">
          <span class="p-author h-card">
            <a class="u-url" href="https://example.com/author"><span class="p-name">Author name</span></a>
          </span>
        </span>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
