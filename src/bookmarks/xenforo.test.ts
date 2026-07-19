import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { xenforoBookmarkResolver } from './xenforo.js'

const makeCard = (
  options: {
    url?: string
    host?: string
    title?: string
    description?: string
    icon?: string
    thumbnail?: string
  } = {},
): string => {
  const figureBlock =
    options.thumbnail !== undefined
      ? `<div class="contentRow-figure contentRow-figure--fixedSmall js-unfurl-figure"><img src="${options.thumbnail}" alt="" data-onerror="hide-parent"/></div>`
      : ''

  const titleBlock =
    options.title !== undefined
      ? `<h3 class="contentRow-header js-unfurl-title"><a href="https://example.com/page" class="link link--external fauxBlockLink-blockLink" target="_blank" rel="nofollow ugc noopener">${options.title}</a></h3>`
      : ''

  const descriptionBlock =
    options.description !== undefined
      ? `<div class="contentRow-snippet js-unfurl-desc">${options.description}</div>`
      : ''

  const iconBlock =
    options.icon !== undefined
      ? `<span class="js-unfurl-favicon"><img src="${options.icon}" alt="" class="bbCodeBlockUnfurl-icon" data-onerror="hide-parent"/></span>`
      : ''

  const urlAttribute = options.url !== undefined ? ` data-url="${options.url}"` : ''
  const hostAttribute = options.host !== undefined ? ` data-host="${options.host}"` : ''

  return [
    `<div class="bbCodeBlock bbCodeBlock--unfurl js-unfurl fauxBlockLink" data-unfurl="true"${urlAttribute}${hostAttribute} data-pending="false">`,
    '<div class="contentRow">',
    figureBlock,
    '<div class="contentRow-main">',
    titleBlock,
    descriptionBlock,
    '<div class="contentRow-minor contentRow-minor--hideLinks">',
    iconBlock,
    '</div>',
    '</div>',
    '</div>',
    '</div>',
  ].join('')
}

describeForEachParser('xenforoBookmarkResolver', (parseHtml) => {
  const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(html).querySelector(xenforoBookmarkResolver.selector)
    return element ? await xenforoBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = makeCard({
        url: 'https://example.com/page',
        host: 'example.com',
        title: 'Page title',
        description: 'Preview text',
        icon: 'https://example.com/favicon.ico',
        thumbnail: 'https://example.com/og-image.jpg',
      })
      const expected: BookmarkResolverResult = {
        provider: 'xenforo',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://example.com/favicon.ico',
        thumbnail: 'https://example.com/og-image.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the url and title are present', async () => {
      const value = makeCard({ url: 'https://example.com/page', title: 'Page title' })
      const expected: BookmarkResolverResult = {
        provider: 'xenforo',
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
    it('should extract a card without a thumbnail figure', async () => {
      const value = makeCard({
        url: 'https://example.com/page',
        host: 'example.com',
        title: 'Page title',
        description: 'Preview text',
        icon: 'https://example.com/favicon.ico',
      })
      const expected: BookmarkResolverResult = {
        provider: 'xenforo',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://example.com/favicon.ico',
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the wrapper url over the inner anchor href', async () => {
      const value = makeCard({ url: 'https://example.com/canonical', title: 'Page title' })

      expect((await extract(value))?.url).toBe('https://example.com/canonical')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = makeCard({ url: 'https://example.com/page', title: '  Padded title  ' })

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the url attribute is missing', async () => {
      const value = makeCard({ title: 'Page title' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = makeCard({ url: 'https://example.com/page', description: 'Preview text' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = makeCard({ url: 'https://example.com/page', title: '   ' })

      expect(await extract(value)).toBeUndefined()
    })
  })
})
