import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { swellBookmarkResolver } from './swell.js'

const makeCard = (
  options: {
    href?: string
    title?: string
    excerpt?: string
    thumbnail?: string
    caption?: string
    internal?: boolean
  } = {},
): string => {
  const variant = options.internal ? '-internal' : '-external'

  const captionBlock =
    options.caption !== undefined
      ? `<span class="p-blogCard__caption">${options.caption}</span>`
      : ''

  const thumbnailBlock =
    options.thumbnail !== undefined
      ? `<div class="p-blogCard__thumb c-postThumb"><figure class="c-postThumb__figure"><img src="${options.thumbnail}" class="c-postThumb__img" width="320" height="180"></figure></div>`
      : ''

  const hrefAttribute = options.href !== undefined ? ` href="${options.href}"` : ''
  const titleBlock =
    options.title !== undefined
      ? `<a class="p-blogCard__title"${hrefAttribute}>${options.title}</a>`
      : ''

  const excerptBlock =
    options.excerpt !== undefined
      ? `<span class="p-blogCard__excerpt">${options.excerpt}</span>`
      : ''

  return [
    '<div class="swell-block-postLink">',
    `<div class="p-blogCard ${variant}" data-type="type1" data-onclick="clickLink">`,
    '<div class="p-blogCard__inner">',
    captionBlock,
    thumbnailBlock,
    '<div class="p-blogCard__body">',
    titleBlock,
    excerptBlock,
    '</div>',
    '</div>',
    '</div>',
    '</div>',
  ].join('')
}

describeForEachParser('swellBookmarkResolver', (parseHtml) => {
  const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(html).querySelector(swellBookmarkResolver.selector)
    return element ? await swellBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        excerpt: 'Preview text',
        thumbnail: 'https://example.com/thumb.jpg',
      })
      const expected: BookmarkResolverResult = {
        provider: 'swell',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract an internal card the same way as an external one', async () => {
      const value = makeCard({
        href: 'https://example.com/other-post',
        title: 'Another post',
        excerpt: 'Preview text',
        internal: true,
      })
      const expected: BookmarkResolverResult = {
        provider: 'swell',
        url: 'https://example.com/other-post',
        title: 'Another post',
        description: 'Preview text',
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the title link is present', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: 'Post title' })
      const expected: BookmarkResolverResult = {
        provider: 'swell',
        url: 'https://example.com/post',
        title: 'Post title',
        description: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('happy paths (verbatim markup)', () => {
    // Structure copied from a real feed, with urls and text replaced. The generated
    // fixtures above can only assert what this file assumes the markup looks like, so
    // this one pins the shape the theme actually emits.
    it('should extract all fields from unmodified theme markup', async () => {
      const value =
        '<div class="swell-block-postLink"><div class="p-blogCard -internal" data-type="type1" data-onclick="clickLink"><div class="p-blogCard__inner"><span class="p-blogCard__caption">Recommended reading</span><div class="p-blogCard__thumb c-postThumb"><figure class="c-postThumb__figure"><img decoding="async" src="https://example.com/thumb.jpg" alt="" class="c-postThumb__img u-obf-cover" width="320" height="180"></figure></div><div class="p-blogCard__body"><a class="p-blogCard__title" href="https://example.com/?page_id=1240">Post title</a><span class="p-blogCard__excerpt">Preview text that the theme truncates with an ellipsis&#8230;</span></div></div></div></div>'
      const expected: BookmarkResolverResult = {
        provider: 'swell',
        url: 'https://example.com/?page_id=1240',
        title: 'Post title',
        description: 'Preview text that the theme truncates with an ellipsis…',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should drop the theme caption', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        caption: 'Recommended reading',
      })
      const expected: BookmarkResolverResult = {
        provider: 'swell',
        url: 'https://example.com/post',
        title: 'Post title',
        description: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: '  Padded title  ' })

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the title link has no href', async () => {
      const value = makeCard({ title: 'Post title' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title link is missing', async () => {
      const value = makeCard({ excerpt: 'Preview text' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: '   ' })

      expect(await extract(value)).toBeUndefined()
    })
  })
})
