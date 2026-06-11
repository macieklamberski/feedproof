import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { substackBookmarkResolver } from './substack.js'

const makeCard = (
  options: {
    name?: string
    baseUrl?: string
    logoUrl?: string
    heroText?: string
    authorName?: string
    rawDataAttrs?: string
    omitDataAttrs?: boolean
  } = {},
): string => {
  if (options.omitDataAttrs) {
    return '<div class="embedded-publication-wrap"></div>'
  }

  const raw =
    options.rawDataAttrs ??
    JSON.stringify({
      name: options.name,
      base_url: options.baseUrl,
      logo_url: options.logoUrl,
      hero_text: options.heroText,
      author_name: options.authorName,
    })

  // Substack stores the JSON in a double-quoted attribute with the inner
  // quotes HTML-encoded, which is what survives a parse/serialise roundtrip.
  const encoded = raw.replace(/"/g, '&quot;')

  return `<div class="embedded-publication-wrap" data-attrs="${encoded}"></div>`
}

describeForEachParser('substackBookmarkResolver', (parseHtml) => {
  const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(html).querySelector(substackBookmarkResolver.selector)
    return element ? await substackBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = makeCard({
        name: 'The Reader',
        baseUrl: 'https://thereader.substack.com',
        logoUrl: 'https://substackcdn.com/image/logo.png',
        heroText: 'A newsletter about things.',
        authorName: 'Author name',
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.substack.com',
        title: 'The Reader',
        description: 'A newsletter about things.',
        author: 'Author name',
        icon: 'https://substackcdn.com/image/logo.png',
      }

      expect(result).toEqual(expected)
    })

    it('should leave optional fields undefined when only name and base_url are present', async () => {
      const value = makeCard({ name: 'The Reader', baseUrl: 'https://thereader.substack.com' })
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.substack.com',
        title: 'The Reader',
        description: undefined,
        author: undefined,
        icon: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should trim whitespace around name, hero_text and author_name', async () => {
      const value = makeCard({
        name: '  The Reader  ',
        baseUrl: 'https://thereader.substack.com',
        heroText: ' A newsletter about things. ',
        authorName: ' Author name ',
      })
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.substack.com',
        title: 'The Reader',
        description: 'A newsletter about things.',
        author: 'Author name',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when base_url is missing', async () => {
      expect(await extract(makeCard({ name: 'The Reader' }))).toBeUndefined()
    })

    it('should return undefined when name is missing', async () => {
      expect(await extract(makeCard({ baseUrl: 'https://thereader.substack.com' }))).toBeUndefined()
    })

    it('should return undefined when name is whitespace-only', async () => {
      const value = makeCard({ name: '   ', baseUrl: 'https://thereader.substack.com' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is valid JSON but not an object', async () => {
      expect(await extract(makeCard({ rawDataAttrs: '"The Reader"' }))).toBeUndefined()
    })

    it('should return undefined when data-attrs is malformed json', async () => {
      expect(await extract(makeCard({ rawDataAttrs: 'not-json' }))).toBeUndefined()
    })

    it('should return undefined when data-attrs is absent', async () => {
      expect(await extract(makeCard({ omitDataAttrs: true }))).toBeUndefined()
    })
  })
})
