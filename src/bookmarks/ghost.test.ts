import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
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
    caption?: string
  } = {},
): string => {
  const metadataParts: Array<string> = []

  if (options.icon !== undefined) {
    metadataParts.push(`<img class="kg-bookmark-icon" src="${options.icon}" alt="">`)
  }

  if (options.publisher !== undefined) {
    metadataParts.push(`<span class="kg-bookmark-author">${options.publisher}</span>`)
  }

  if (options.author !== undefined) {
    metadataParts.push(`<span class="kg-bookmark-publisher">${options.author}</span>`)
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

  const captionBlock =
    options.caption !== undefined ? `<figcaption>${options.caption}</figcaption>` : ''

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
    captionBlock,
    '</figure>',
  ].join('')
}

describeForEachParser('ghostBookmarkResolver', (parseHtml) => {
  const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(html).querySelector(ghostBookmarkResolver.selector)
    return element ? await ghostBookmarkResolver.extract(element) : undefined
  }

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

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only title and href are present', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: 'Post title' })
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: undefined,
        author: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should return raw url and icon (hygiene is applied by the placeholder builder)', async () => {
      const value = makeCard({
        href: 'http://example.com/post',
        title: 'T',
        icon: 'http://example.com/i.ico',
      })
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'http://example.com/post',
        title: 'T',
        icon: 'http://example.com/i.ico',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should map the figcaption to the caption field', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        caption: 'My note about why this link matters',
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        caption: 'My note about why this link matters',
        author: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(result).toEqual(expected)
    })

    // Ghost >= 5.87 tidies bookmark cards in its RSS pipeline: icon, thumbnail and
    // metadata are removed and the description is wrapped in <small>.
    it('should extract the slimmed RSS card shape', async () => {
      const value =
        '<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://example.com/post"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Post title</div><div class="kg-bookmark-description"><small>Preview text</small></div></div></a></figure>'
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        author: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(result).toEqual(expected)
    })

    // Optional fields pass through raw; createBookmarkPlaceholder trims every field
    // when it writes the attributes. Only the guard-checked title is trimmed here.
    it('should trim the title and pass optional text fields through raw', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: '  Post title  ',
        description: ' Preview text ',
        author: ' Author name ',
        publisher: ' Publisher name ',
      })
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: ' Preview text ',
        author: ' Author name ',
        publisher: ' Publisher name ',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when href is missing', async () => {
      expect(await extract(makeCard({ title: 'Post title' }))).toBeUndefined()
    })

    it('should return undefined when title is missing', async () => {
      expect(await extract(makeCard({ href: 'https://example.com/post' }))).toBeUndefined()
    })

    it('should return undefined when title is whitespace-only', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: '   ' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when href is empty', async () => {
      expect(await extract(makeCard({ href: '', title: 'Post title' }))).toBeUndefined()
    })

    it('should return undefined when no bookmark card is present', async () => {
      expect(await extract('<p>Regular content</p>')).toBeUndefined()
    })
  })
})
