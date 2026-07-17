import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { substackBookmarkResolver, substackPostBookmarkResolver } from './substack.js'

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

    // Optional fields pass through raw; createBookmarkPlaceholder trims every field
    // when it writes the attributes. Only the guard-checked title is trimmed here.
    it('should trim the name and pass hero_text and author_name through raw', async () => {
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
        description: ' A newsletter about things. ',
        author: ' Author name ',
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
