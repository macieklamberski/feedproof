import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { substackPostBookmarkResolver } from './substack.js'

const makePostCard = (
  options: {
    className?: string
    title?: string
    url?: string
    canonicalUrl?: string
    truncatedBodyText?: string
    coverImage?: string
    publicationName?: string
    publicationLogoUrl?: string
    publishedBylines?: Array<{ name?: string }>
    bylines?: Array<{ name?: string }>
    postDate?: string
    date?: string
    rawDataAttrs?: string
    omitDataAttrs?: boolean
  } = {},
): string => {
  const className = options.className ?? 'digest-post-embed'

  if (options.omitDataAttrs) {
    return `<div class="${className}"></div>`
  }

  const raw =
    options.rawDataAttrs ??
    JSON.stringify({
      title: options.title,
      url: options.url,
      canonical_url: options.canonicalUrl,
      truncated_body_text: options.truncatedBodyText,
      cover_image: options.coverImage,
      publication_name: options.publicationName,
      publication_logo_url: options.publicationLogoUrl,
      publishedBylines: options.publishedBylines,
      bylines: options.bylines,
      post_date: options.postDate,
      date: options.date,
    })

  // Substack stores the JSON in a double-quoted attribute with the inner
  // quotes HTML-encoded, which is what survives a parse/serialise roundtrip.
  const encoded = raw.replace(/"/g, '&quot;')

  return `<div class="${className}" data-attrs="${encoded}"></div>`
}

describeForEachParser('substackPostBookmarkResolver', (parseHtml) => {
  const extract = async (html: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(html).querySelector(substackPostBookmarkResolver.selector)
    return element ? await substackPostBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete embedded post card', async () => {
      const value = makePostCard({
        className: 'embedded-post-wrap',
        title: 'Why Does Everyone Hate AI?',
        url: 'https://thereader.example.com/p/why-does-everyone-hate-ai',
        truncatedBodyText: 'A look at the backlash.',
        coverImage: 'https://cdn.example.com/cover.png',
        publicationName: 'The Reader',
        publicationLogoUrl: 'https://cdn.example.com/logo.png',
        publishedBylines: [{ name: 'Author name' }],
        date: '2026-06-25T10:31:02.000Z',
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/why-does-everyone-hate-ai',
        title: 'Why Does Everyone Hate AI?',
        description: 'A look at the backlash.',
        author: 'Author name',
        publisher: 'The Reader',
        date: '2026-06-25T10:31:02.000Z',
        icon: 'https://cdn.example.com/logo.png',
        thumbnail: 'https://cdn.example.com/cover.png',
      }

      expect(result).toEqual(expected)
    })

    it('should extract a digest card using canonical_url', async () => {
      const value = makePostCard({
        title: 'Model Drop',
        canonicalUrl: 'https://thereader.example.com/p/model-drop',
        coverImage: 'https://cdn.example.com/cover.webp',
        publicationName: 'The Reader',
        publishedBylines: [],
        postDate: '2026-07-09T20:28:23.465Z',
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
        description: undefined,
        author: undefined,
        publisher: 'The Reader',
        date: '2026-07-09T20:28:23.465Z',
        icon: undefined,
        thumbnail: 'https://cdn.example.com/cover.webp',
      }

      expect(result).toEqual(expected)
    })

    it('should prefer canonical_url over url when both are present', async () => {
      const value = makePostCard({
        title: 'Model Drop',
        url: 'https://example.com/p/duplicate',
        canonicalUrl: 'https://thereader.example.com/p/model-drop',
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
        description: undefined,
        author: undefined,
        publisher: undefined,
        date: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(result).toEqual(expected)
    })

    it('should fall back to the bylines key for the author', async () => {
      const value = makePostCard({
        title: 'Model Drop',
        canonicalUrl: 'https://thereader.example.com/p/model-drop',
        bylines: [{ name: 'Author name' }],
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
        description: undefined,
        author: 'Author name',
        publisher: undefined,
        date: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(result).toEqual(expected)
    })

    // Optional fields pass through raw; createBookmarkPlaceholder trims every field
    // when it writes the attributes. Only the guard-checked title is trimmed here.
    it('should trim the title and pass optional text fields through raw', async () => {
      const value = makePostCard({
        title: '  Model Drop  ',
        canonicalUrl: 'https://thereader.example.com/p/model-drop',
        truncatedBodyText: ' A look at the backlash. ',
        publicationName: ' The Reader ',
        publishedBylines: [{ name: ' Author name ' }],
      })
      const result = await extract(value)
      const expected: BookmarkResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
        description: ' A look at the backlash. ',
        author: ' Author name ',
        publisher: ' The Reader ',
        date: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(result).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when both canonical_url and url are missing', async () => {
      expect(await extract(makePostCard({ title: 'Model Drop' }))).toBeUndefined()
    })

    it('should return undefined when title is missing', async () => {
      const value = makePostCard({ canonicalUrl: 'https://thereader.example.com/p/model-drop' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when title is whitespace-only', async () => {
      const value = makePostCard({
        title: '   ',
        canonicalUrl: 'https://thereader.example.com/p/model-drop',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is valid JSON but not an object', async () => {
      expect(await extract(makePostCard({ rawDataAttrs: '"Model Drop"' }))).toBeUndefined()
    })

    it('should return undefined when data-attrs is malformed json', async () => {
      expect(await extract(makePostCard({ rawDataAttrs: 'not-json' }))).toBeUndefined()
    })

    it('should return undefined when data-attrs is absent', async () => {
      expect(await extract(makePostCard({ omitDataAttrs: true }))).toBeUndefined()
    })
  })
})
