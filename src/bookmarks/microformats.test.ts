import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { microformatsBookmarkResolver } from './microformats.js'

describeForEachParser('microformatsBookmarkResolver', (parseHtml) => {
  const extract = async (value: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(microformatsBookmarkResolver.selector)
    return element ? await microformatsBookmarkResolver.extract(element) : undefined
  }

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
      const expected: BookmarkResolverResult = {
        provider: 'microformats',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        author: 'Author name',
        thumbnail: 'https://example.com/cover.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract a minimal citation with only url and name', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url p-name" href="https://example.com/post">Page title</a>
        </span>
      `
      const expected: BookmarkResolverResult = {
        provider: 'microformats',
        url: 'https://example.com/post',
        title: 'Page title',
        description: undefined,
        author: undefined,
        thumbnail: undefined,
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
      const expected: BookmarkResolverResult = {
        provider: 'microformats',
        url: 'https://example.com/book',
        title: 'Book title',
        author: 'Author name',
        description: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
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

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <span class="h-cite">
          <a class="u-url" href="https://example.com/post"><span class="p-name"> Padded title </span></a>
        </span>
      `

      expect((await extract(value))?.title).toBe('Padded title')
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
