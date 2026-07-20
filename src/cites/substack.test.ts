import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { substackCrossPostCiteResolver, substackOwnPostCiteResolver } from './substack.js'

// Substack ships these cards as empty divs whose data lives in a `data-attrs` JSON blob,
// stored in a double-quoted attribute with the inner quotes HTML-encoded — that is what
// survives a parse/serialise roundtrip. Tests pass the attrs object with Substack's own
// key names so the wire keys stay visible at the call site.
const makeCard = (className: string, attrs?: Record<string, unknown> | string): string => {
  if (attrs === undefined) {
    return `<div class="${className}"></div>`
  }

  const raw = typeof attrs === 'string' ? attrs : JSON.stringify(attrs)
  const encoded = raw.replace(/"/g, '&quot;')

  return `<div class="${className}" data-attrs="${encoded}"></div>`
}

describeForEachParser('substackOwnPostCiteResolver', (parseHtml) => {
  const extract = async (value: string): Promise<CiteResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(substackOwnPostCiteResolver.selector)
    return element ? await substackOwnPostCiteResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete post card', async () => {
      const value = makeCard('digest-post-embed', {
        title: 'Why Does Everyone Hate AI?',
        canonical_url: 'https://thereader.example.com/p/why-does-everyone-hate-ai',
        caption: 'A look at the backlash.',
        cover_image: 'https://cdn.example.com/cover.png',
        publication_name: 'The Reader',
        publication_logo_url: 'https://cdn.example.com/logo.png',
        publishedBylines: [{ name: 'Author name' }],
        post_date: '2026-06-25T10:31:02.000Z',
      })
      const expected: CiteResolverResult = {
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract a digest card using canonical_url', async () => {
      const value = makeCard('digest-post-embed', {
        title: 'Model Drop',
        canonical_url: 'https://thereader.example.com/p/model-drop',
        cover_image: 'https://cdn.example.com/cover.webp',
        publication_name: 'The Reader',
        publishedBylines: [],
        post_date: '2026-07-09T20:28:23.465Z',
      })
      const expected: CiteResolverResult = {
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should return undefined when only the cross-post url key is present', async () => {
      const value = makeCard('digest-post-embed', {
        title: 'Model Drop',
        url: 'https://example.com/p/duplicate',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the cross-post bylines key', async () => {
      const value = makeCard('digest-post-embed', {
        title: 'Model Drop',
        canonical_url: 'https://thereader.example.com/p/model-drop',
        bylines: [{ name: 'Author name' }],
      })

      expect((await extract(value))?.author).toBeUndefined()
    })

    // Optional fields pass through raw; createCitePlaceholder trims every field
    // when it writes the attributes. Only the guard-checked title is trimmed here.
    it('should trim the title and pass optional text fields through raw', async () => {
      const value = makeCard('digest-post-embed', {
        title: '  Model Drop  ',
        canonical_url: 'https://thereader.example.com/p/model-drop',
        caption: ' A look at the backlash. ',
        publication_name: ' The Reader ',
        publishedBylines: [{ name: ' Author name ' }],
      })
      const expected: CiteResolverResult = {
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

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when canonical_url is missing', async () => {
      const value = makeCard('digest-post-embed', { title: 'Model Drop' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when title is missing', async () => {
      const value = makeCard('digest-post-embed', {
        canonical_url: 'https://thereader.example.com/p/model-drop',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when title is whitespace-only', async () => {
      const value = makeCard('digest-post-embed', {
        title: '   ',
        canonical_url: 'https://thereader.example.com/p/model-drop',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is valid JSON but not an object', async () => {
      const value = makeCard('digest-post-embed', '"Model Drop"')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is malformed json', async () => {
      const value = makeCard('digest-post-embed', 'not-json')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is absent', async () => {
      const value = makeCard('digest-post-embed')

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('substackCrossPostCiteResolver', (parseHtml) => {
  const extract = async (value: string): Promise<CiteResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(substackCrossPostCiteResolver.selector)
    return element ? await substackCrossPostCiteResolver.extract(element) : undefined
  }

  it('should extract all fields from a complete cross-post card', async () => {
    const value = makeCard('embedded-post-wrap', {
      title: 'Why Does Everyone Hate AI?',
      url: 'https://thereader.example.com/p/why-does-everyone-hate-ai',
      truncated_body_text: 'A look at the backlash.',
      cover_image: 'https://cdn.example.com/cover.png',
      publication_name: 'The Reader',
      publication_logo_url: 'https://cdn.example.com/logo.png',
      bylines: [{ name: 'Author name' }],
      date: '2023-10-08T10:00:31.798Z',
    })
    const expected: CiteResolverResult = {
      provider: 'substack',
      url: 'https://thereader.example.com/p/why-does-everyone-hate-ai',
      title: 'Why Does Everyone Hate AI?',
      description: 'A look at the backlash.',
      author: 'Author name',
      publisher: 'The Reader',
      date: '2023-10-08T10:00:31.798Z',
      icon: 'https://cdn.example.com/logo.png',
      thumbnail: 'https://cdn.example.com/cover.png',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore the own-post publishedBylines key', async () => {
    const value = makeCard('embedded-post-wrap', {
      title: 'Model Drop',
      url: 'https://thereader.example.com/p/model-drop',
      publishedBylines: [{ name: 'Author name' }],
    })

    expect((await extract(value))?.author).toBeUndefined()
  })

  it('should not match the own-post class', async () => {
    const value = makeCard('digest-post-embed', {
      title: 'Model Drop',
      canonical_url: 'https://thereader.example.com/p/model-drop',
    })

    expect(await extract(value)).toBeUndefined()
  })
})
