import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { parseHtml } from '../../parsers/linkedom.js'
import { baseContext } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { convertGhostBookmarkCards } from './convertGhostBookmarkCards.js'

const makeCard = (
  options: {
    href?: string
    title?: string
    description?: string
    icon?: string
    iconAlt?: string
    author?: string
    publisher?: string
    thumbnail?: string
  } = {},
): string => {
  const metadataParts: Array<string> = []

  if (options.icon !== undefined) {
    const alt = options.iconAlt ?? ''
    metadataParts.push(`<img class="kg-bookmark-icon" src="${options.icon}" alt="${alt}">`)
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

describe('convertGhostBookmarkCards', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [convertGhostBookmarkCards(context)])
  }

  describe('happy paths', () => {
    it('should emit a placeholder with all 7 fields when the source card is complete', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        icon: 'https://example.com/favicon.ico',
        author: 'Author name',
        publisher: 'Publisher name',
        thumbnail: 'https://example.com/og-image.jpg',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-kind="bookmark"')
      expect(result).toContain('data-widget-provider="ghost"')
      expect(result).toContain('data-widget-url="https://example.com/post"')
      expect(result).toContain('data-widget-title="Post title"')
      expect(result).toContain('data-widget-description="Preview text"')
      expect(result).toContain('data-widget-author="Author name"')
      expect(result).toContain('data-widget-publisher="Publisher name"')
      expect(result).toContain('data-widget-icon="https://example.com/favicon.ico"')
      expect(result).toContain('data-widget-thumbnail="https://example.com/og-image.jpg"')
      expect(result).toContain('<a href="https://example.com/post">Post title</a>')
      expect(result).not.toContain('<figure')
      expect(result).not.toContain('kg-bookmark')
    })

    it('should omit optional attributes when only title is present (no metadata block)', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-kind="bookmark"')
      expect(result).toContain('data-widget-provider="ghost"')
      expect(result).toContain('data-widget-url="https://example.com/post"')
      expect(result).toContain('data-widget-title="Post title"')
      expect(result).not.toContain('data-widget-description')
      expect(result).not.toContain('data-widget-author')
      expect(result).not.toContain('data-widget-publisher')
      expect(result).not.toContain('data-widget-icon')
      expect(result).not.toContain('data-widget-thumbnail')
      expect(result).toContain('<a href="https://example.com/post">Post title</a>')
    })

    it('should include description when metadata block is missing', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-description="Preview text"')
      expect(result).not.toContain('data-widget-author')
      expect(result).not.toContain('data-widget-icon')
      expect(result).not.toContain('data-widget-thumbnail')
    })

    it('should omit data-widget-thumbnail when source has metadata but no thumbnail div', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        author: 'Author name',
        publisher: 'Publisher name',
      })
      const result = await transform(value)

      expect(result).not.toContain('data-widget-thumbnail')
      expect(result).toContain('data-widget-author="Author name"')
      expect(result).toContain('data-widget-publisher="Publisher name"')
    })

    it('should extract icon src even when the alt attribute is empty', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        icon: 'https://example.com/favicon.ico',
        iconAlt: '',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-icon="https://example.com/favicon.ico"')
    })
  })

  describe('edge cases', () => {
    it('should leave content unchanged when no bookmark cards are present', async () => {
      const value = '<p>Regular content without bookmark cards</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave the card untouched when href is missing', async () => {
      const value = makeCard({ title: 'Post title' })

      expect(await transform(value)).toBe(value)
    })

    it('should leave the card untouched when title is missing', async () => {
      const value = makeCard({ href: 'https://example.com/post' })

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
      })
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should emit sibling placeholders for consecutive cards without wrapping them in a list', async () => {
      const value = [
        makeCard({ href: 'https://example.com/a1', title: 'Title 1' }),
        makeCard({ href: 'https://example.com/a2', title: 'Title 2' }),
      ].join('')
      const result = await transform(value)

      expect(result).not.toContain('<ul')
      expect(result).not.toContain('<li')

      const placeholderCount = (result.match(/data-widget-kind="bookmark"/g) ?? []).length
      expect(placeholderCount).toBe(2)
    })

    it('should drop unsafe icon and thumbnail urls but keep the rest of the placeholder', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        icon: 'javascript:alert(1)',
        thumbnail: 'javascript:alert(2)',
      })
      const result = await transform(value)

      expect(result).not.toContain('data-widget-icon')
      expect(result).not.toContain('data-widget-thumbnail')
      expect(result).toContain('data-widget-title="Post title"')
    })

    it('should upgrade http urls to https for url, icon, and thumbnail', async () => {
      const value = makeCard({
        href: 'http://example.com/post',
        title: 'Post title',
        icon: 'http://example.com/favicon.ico',
        thumbnail: 'http://example.com/thumb.jpg',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-url="https://example.com/post"')
      expect(result).toContain('data-widget-icon="https://example.com/favicon.ico"')
      expect(result).toContain('data-widget-thumbnail="https://example.com/thumb.jpg"')
      expect(result).toContain('<a href="https://example.com/post">')
    })
  })
})
