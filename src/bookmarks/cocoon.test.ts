import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { cocoonBookmarkResolver } from './cocoon.js'

const makeCard = (
  options: {
    href?: string
    linkTitle?: string
    title?: string
    snippet?: string
    snipet?: string
    date?: string
    domain?: string
    favicon?: string
    thumbnail?: string
    internal?: boolean
  } = {},
): string => {
  const variant = options.internal ? 'internal' : 'external'

  const thumbnailBlock =
    options.thumbnail !== undefined
      ? `<figure class="blogcard-thumbnail ${variant}-blogcard-thumbnail"><img src="${options.thumbnail}" class="blogcard-thumb-image ${variant}-blogcard-thumb-image" width="320" height="180"></figure>`
      : ''

  const titleBlock =
    options.title !== undefined
      ? `<div class="blogcard-title ${variant}-blogcard-title">${options.title}</div>`
      : ''

  const snippetBlock =
    options.snippet !== undefined
      ? `<div class="blogcard-snippet ${variant}-blogcard-snippet">${options.snippet}</div>`
      : ''

  const snipetBlock =
    options.snipet !== undefined
      ? `<div class="blogcard-snipet ${variant}-blogcard-snipet">${options.snipet}</div>`
      : ''

  const dateBlock =
    options.date !== undefined
      ? `<div class="blogcard-date ${variant}-blogcard-date"><div class="blogcard-post-date ${variant}-blogcard-post-date">${options.date}</div></div>`
      : ''

  const faviconBlock =
    options.favicon !== undefined
      ? `<div class="blogcard-favicon ${variant}-blogcard-favicon"><img src="${options.favicon}" class="blogcard-favicon-image ${variant}-blogcard-favicon-image" width="16" height="16"></div>`
      : ''

  const domainBlock =
    options.domain !== undefined
      ? `<div class="blogcard-domain ${variant}-blogcard-domain">${options.domain}</div>`
      : ''

  const hrefAttribute = options.href !== undefined ? ` href="${options.href}"` : ''
  const titleAttribute = options.linkTitle !== undefined ? ` title="${options.linkTitle}"` : ''

  return [
    `<a${hrefAttribute}${titleAttribute} class="blogcard-wrap ${variant}-blogcard-wrap a-wrap cf" target="_blank">`,
    `<div class="blogcard ${variant}-blogcard eb-left cf">`,
    thumbnailBlock,
    `<div class="blogcard-content ${variant}-blogcard-content">`,
    titleBlock,
    snippetBlock,
    snipetBlock,
    '</div>',
    `<div class="blogcard-footer ${variant}-blogcard-footer cf">`,
    `<div class="blogcard-site ${variant}-blogcard-site">`,
    faviconBlock,
    domainBlock,
    '</div>',
    dateBlock,
    '</div>',
    '</div>',
    '</a>',
  ].join('')
}

describeForEachParser('cocoonBookmarkResolver', (parseHtml) => {
  const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(html).querySelector(cocoonBookmarkResolver.selector)
    return element ? await cocoonBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        snippet: 'Preview text',
        date: '2018.10.14',
        domain: 'example.com',
        favicon: 'https://example.com/favicon.ico',
        thumbnail: 'https://example.com/thumb.jpg',
      })
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        publisher: 'example.com',
        date: '2018.10.14',
        icon: 'https://example.com/favicon.ico',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract an internal card the same way as an external one', async () => {
      const value = makeCard({
        href: 'https://example.com/other-post',
        title: 'Another post',
        snippet: 'Preview text',
        internal: true,
      })
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/other-post',
        title: 'Another post',
        description: 'Preview text',
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only href and title are present', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: 'Post title' })
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/post',
        title: 'Post title',
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
    // this one pins the shape the theme actually emits.
    it('should extract all fields from unmodified theme markup', async () => {
      const value =
        '<a target="_blank" href="https://example.com/post" title="Post title" class="blogcard-wrap internal-blogcard-wrap a-wrap cf"><div class="blogcard internal-blogcard ib-left cf"><figure class="blogcard-thumbnail internal-blogcard-thumbnail"><img width="160" height="90" src="https://example.com/thumb.jpg" class="blogcard-thumb-image internal-blogcard-thumb-image wp-post-image" alt="" srcset="https://example.com/thumb.jpg 160w, https://example.com/thumb-320.jpg 320w" sizes="(max-width: 160px) 100vw, 160px"></figure><div class="blogcard-content internal-blogcard-content"><div class="blogcard-title internal-blogcard-title">Post title</div><div class="blogcard-snipet internal-blogcard-snipet"> Preview text that the theme truncates with an ellipsis...</div></div><div class="blogcard-footer internal-blogcard-footer cf"><div class="blogcard-site internal-blogcard-site"><div class="blogcard-favicon internal-blogcard-favicon"><img src="//www.google.com/s2/favicons?domain=example.com" class="blogcard-favicon-image internal-blogcard-favicon-image" alt="" width="16" height="16"></div><div class="blogcard-domain internal-blogcard-domain">example.com</div></div><div class="blogcard-date internal-blogcard-date"><div class="blogcard-post-date internal-blogcard-post-date">2018.10.14</div></div></div></div></a>'
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/post',
        title: 'Post title',
        description: ' Preview text that the theme truncates with an ellipsis...',
        publisher: 'example.com',
        date: '2018.10.14',
        icon: '//www.google.com/s2/favicons?domain=example.com',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the description from the misspelled snippet class', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        snipet: 'Preview text',
      })

      expect((await extract(value))?.description).toBe('Preview text')
    })

    it('should pass the date through in the theme format', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Post title',
        date: '2018.10.14',
      })

      expect((await extract(value))?.date).toBe('2018.10.14')
    })

    it('should fall back to the anchor title attribute when the title element is missing', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        linkTitle: 'Title from attribute',
      })
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/post',
        title: 'Title from attribute',
        description: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the title element over the anchor title attribute', async () => {
      const value = makeCard({
        href: 'https://example.com/post',
        title: 'Title from element',
        linkTitle: 'Title from attribute',
      })

      expect((await extract(value))?.title).toBe('Title from element')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: '  Padded title  ' })

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the href is missing', async () => {
      const value = makeCard({ title: 'Post title' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when no title is available', async () => {
      const value = makeCard({ href: 'https://example.com/post' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = makeCard({ href: 'https://example.com/post', title: '   ' })

      expect(await extract(value)).toBeUndefined()
    })
  })
})
