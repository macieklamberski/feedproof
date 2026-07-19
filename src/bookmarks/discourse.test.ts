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
    engine?: string
  } = {},
): string => {
  const engine = options.engine ?? 'allowlistedgeneric'
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
    `<aside class="onebox ${engine}"${srcAttribute}>`,
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

  describe('edge cases', () => {
    it('should extract a card built by a per-site engine', async () => {
      const value = makeCard({
        src: 'https://github.com/owner/repo/issues/1',
        title: 'Issue title',
        description: 'Issue body',
        engine: 'githubissue',
      })
      const expected: BookmarkResolverResult = {
        provider: 'discourse',
        url: 'https://github.com/owner/repo/issues/1',
        title: 'Issue title',
        description: 'Issue body',
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

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
