import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { discourseBookmarkResolver } from './discourse.js'

const makeCard = (
  options: {
    src?: string
    title?: string
    titleLevel?: 'h3' | 'h4'
    description?: string
    publisher?: string
    icon?: string
    thumbnail?: string
  } = {},
): string => {
  const level = options.titleLevel ?? 'h3'

  const iconBlock =
    options.icon !== undefined ? `<img src="${options.icon}" class="site-icon" alt="">` : ''

  const publisherBlock =
    options.publisher !== undefined
      ? `<a href="https://example.com/page" target="_blank" rel="noopener nofollow ugc">${options.publisher}</a>`
      : ''

  const thumbnailBlock =
    options.thumbnail !== undefined
      ? `<div class="aspect-image" style="--aspect-ratio:690/362;"><img src="${options.thumbnail}"></div>`
      : ''

  const titleBlock =
    options.title !== undefined
      ? `<${level}><a href="https://example.com/page" target="_blank">${options.title}</a></${level}>`
      : ''

  const descriptionBlock = options.description !== undefined ? `<p>${options.description}</p>` : ''

  const srcAttribute = options.src !== undefined ? ` data-onebox-src="${options.src}"` : ''

  return [
    `<aside class="onebox allowlistedgeneric"${srcAttribute}>`,
    '<header class="source">',
    iconBlock,
    publisherBlock,
    '</header>',
    '<article class="onebox-body">',
    thumbnailBlock,
    titleBlock,
    descriptionBlock,
    '</article>',
    '<div class="onebox-metadata"></div>',
    '</aside>',
  ].join('')
}

describeForEachParser('discourseBookmarkResolver', (parseHtml) => {
  const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(html).querySelector(discourseBookmarkResolver.selector)
    return element ? await discourseBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = makeCard({
        src: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://example.com/favicon.png',
        thumbnail: 'https://example.com/og-image.jpg',
      })
      const expected: BookmarkResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://example.com/favicon.png',
        thumbnail: 'https://example.com/og-image.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the source and title are present', async () => {
      const value = makeCard({ src: 'https://example.com/page', title: 'Page title' })
      const expected: BookmarkResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page',
        title: 'Page title',
        description: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('happy paths (verbatim markup)', () => {
    // Structure copied from a real feed, with urls and text replaced. The generated
    // fixtures above can only assert what this file assumes the markup looks like, so
    // this one pins the shape Discourse actually emits.
    it('should extract all fields from unmodified onebox markup', async () => {
      const value =
        '<aside class="onebox allowlistedgeneric" data-onebox-src="https://example.com/page#comment-1"><header class="source"><img src="https://forum.example.org/uploads/default/original/2X/1/icon.png" class="site-icon" alt="" data-dominant-color="B4C5E1" width="32" height="32"><a href="https://example.com/page#comment-1" target="_blank" rel="noopener nofollow ugc">example.com</a></header><article class="onebox-body"><div class="aspect-image" style="--aspect-ratio:690/362;"><img src="https://forum.example.org/uploads/default/optimized/2X/d/thumb.jpeg" class="thumbnail" data-dominant-color="DEDEDE" width="690" height="362"></div><h3><a href="https://example.com/page#comment-1" target="_blank" rel="noopener nofollow ugc">Page title</a></h3><p>Preview text pulled from the linked page.</p></article><div class="onebox-metadata"></div><div style="clear: both"></div></aside>'
      const expected: BookmarkResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page#comment-1',
        title: 'Page title',
        description: 'Preview text pulled from the linked page.',
        publisher: 'example.com',
        icon: 'https://forum.example.org/uploads/default/original/2X/1/icon.png',
        thumbnail: 'https://forum.example.org/uploads/default/optimized/2X/d/thumb.jpeg',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the title from a level-four heading', async () => {
      const value = makeCard({
        src: 'https://example.com/page',
        title: 'Page title',
        titleLevel: 'h4',
      })

      expect((await extract(value))?.title).toBe('Page title')
    })

    it('should prefer the wrapper source over the inner anchor href', async () => {
      const value = makeCard({
        src: 'https://example.com/canonical',
        title: 'Page title',
        publisher: 'example.com',
      })

      expect((await extract(value))?.url).toBe('https://example.com/canonical')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = makeCard({ src: 'https://example.com/page', title: '  Padded title  ' })

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the source attribute is missing', async () => {
      const value = makeCard({ title: 'Page title' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = makeCard({ src: 'https://example.com/page', description: 'Preview text' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = makeCard({ src: 'https://example.com/page', title: '   ' })

      expect(await extract(value)).toBeUndefined()
    })
  })
})
