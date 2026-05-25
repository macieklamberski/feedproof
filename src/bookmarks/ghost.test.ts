import { describe, expect, it } from 'bun:test'
import { parseHtml } from '../parsers/linkedom.js'
import type { BookmarkResolverResult } from '../types.js'
import { ghostBookmarkResolver } from './ghost.js'

const makeCard = (
  options: {
    href?: string
    title?: string
    description?: string
    icon?: string
    author?: string
    publisher?: string
    thumbnail?: string
  } = {},
): string => {
  const metadataParts: Array<string> = []

  if (options.icon !== undefined) {
    metadataParts.push(`<img class="kg-bookmark-icon" src="${options.icon}" alt="">`)
  }

  if (options.author !== undefined) {
    metadataParts.push(`<span class="kg-bookmark-author">${options.author}</span>`)
  }

  if (options.publisher !== undefined) {
    metadataParts.push(`<span class="kg-bookmark-publisher">${options.publisher}</span>`)
  }

  const metadataBlock = metadataParts.length
    ? `<div class="kg-bookmark-metadata">${metadataParts.join('')}</div>`
    : ''

  const descriptionBlock =
    options.description !== undefined
      ? `<div class="kg-bookmark-description">${options.description}</div>`
      : ''

  const titleBlock =
    options.title !== undefined ? `<div class="kg-bookmark-title">${options.title}</div>` : ''

  const thumbnailBlock =
    options.thumbnail !== undefined
      ? `<div class="kg-bookmark-thumbnail"><img src="${options.thumbnail}"></div>`
      : ''

  const containerOpen =
    options.href !== undefined
      ? `<a class="kg-bookmark-container" href="${options.href}">`
      : '<a class="kg-bookmark-container">'

  return [
    '<figure class="kg-card kg-bookmark-card">',
    containerOpen,
    '<div class="kg-bookmark-content">',
    titleBlock,
    descriptionBlock,
    metadataBlock,
    '</div>',
    thumbnailBlock,
    '</a>',
    '</figure>',
  ].join('')
}

const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
  const element = parseHtml(html).querySelector(ghostBookmarkResolver.selector)
  return element ? await ghostBookmarkResolver.extract(element) : undefined
}

describe('ghostBookmarkResolver', () => {
  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        icon: 'https://example.com/favicon.ico',
        author: 'Author name',
        publisher: 'Publisher name',
        thumbnail: 'https://example.com/og-image.jpg',
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        author: 'Author name',
        publisher: 'Publisher name',
        icon: 'https://example.com/favicon.ico',
        thumbnail: 'https://example.com/og-image.jpg',
      }

      expect(result).toEqual(expected)
    })

    it('should leave optional fields undefined when only title and href are present', async () => {
      const result = await extract(
        makeCard({ href: 'https://example.com/post', title: 'Post title' }),
      )

      expect(result?.provider).toBe('ghost')
      expect(result?.url).toBe('https://example.com/post')
      expect(result?.title).toBe('Post title')
      expect(result?.description).toBeUndefined()
      expect(result?.author).toBeUndefined()
      expect(result?.publisher).toBeUndefined()
      expect(result?.icon).toBeUndefined()
      expect(result?.thumbnail).toBeUndefined()
    })

    it('should return raw url and icon (hygiene is applied by the placeholder builder)', async () => {
      const result = await extract(
        makeCard({ href: 'http://example.com/post', title: 'T', icon: 'http://example.com/i.ico' }),
      )

      expect(result?.url).toBe('http://example.com/post')
      expect(result?.icon).toBe('http://example.com/i.ico')
    })
  })

  describe('edge cases', () => {
    it('should return undefined when href is missing', async () => {
      expect(await extract(makeCard({ title: 'Post title' }))).toBeUndefined()
    })

    it('should return undefined when title is missing', async () => {
      expect(await extract(makeCard({ href: 'https://example.com/post' }))).toBeUndefined()
    })

    it('should return undefined when no bookmark card is present', async () => {
      expect(await extract('<p>Regular content</p>')).toBeUndefined()
    })
  })
})
