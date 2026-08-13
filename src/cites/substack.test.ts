import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor, substackAttrs } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { substackCrossPostCiteResolver, substackOwnPostCiteResolver } from './substack.js'

// Substack ships these cards as empty divs whose data lives in a `data-attrs` JSON blob,
// stored in a double-quoted attribute with the inner quotes HTML-encoded — that is what
// survives a parse/serialise roundtrip. Tests pass the attrs object with Substack's own
// key names so the wire keys stay visible at the call site.
const makeContainer = (className: string, attrs?: Record<string, unknown> | string): string => {
  if (attrs === undefined) {
    return `<div class="${className}"></div>`
  }

  return `<div class="${className}" data-attrs="${substackAttrs(attrs)}"></div>`
}

describeForEachParser('substackOwnPostCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, substackOwnPostCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete post card', async () => {
      const value = makeContainer('digest-post-embed', {
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
      const value = makeContainer('digest-post-embed', {
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
        publisher: 'The Reader',
        date: '2026-07-09T20:28:23.465Z',
        thumbnail: 'https://cdn.example.com/cover.webp',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should return undefined when only the cross-post url key is present', async () => {
      const value = makeContainer('digest-post-embed', {
        title: 'Model Drop',
        url: 'https://example.com/p/duplicate',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the cross-post bylines key', async () => {
      const value = makeContainer('digest-post-embed', {
        title: 'Model Drop',
        canonical_url: 'https://thereader.example.com/p/model-drop',
        bylines: [{ name: 'Author name' }],
      })
      const expected: CiteResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Optional fields pass through raw; createCitePlaceholder trims every field
    // when it writes the attributes. Only the guard-checked title is trimmed here.
    it('should trim every text field', async () => {
      const value = makeContainer('digest-post-embed', {
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
        description: 'A look at the backlash.',
        author: 'Author name',
        publisher: 'The Reader',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when canonical_url is missing', async () => {
      const value = makeContainer('digest-post-embed', { title: 'Model Drop' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when title is missing', async () => {
      const value = makeContainer('digest-post-embed', {
        canonical_url: 'https://thereader.example.com/p/model-drop',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when title is whitespace-only', async () => {
      const value = makeContainer('digest-post-embed', {
        title: '   ',
        canonical_url: 'https://thereader.example.com/p/model-drop',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is valid JSON but not an object', async () => {
      const value = makeContainer('digest-post-embed', '"Model Drop"')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is malformed json', async () => {
      const value = makeContainer('digest-post-embed', 'not-json')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is absent', async () => {
      const value = makeContainer('digest-post-embed')

      expect(await extract(value)).toBeUndefined()
    })
  })

  // The shape a reader-mode fetch of the post page returns: no data-attrs, fields as markup.
  describe('rendered shape', () => {
    it('should extract every field from a rendered card', async () => {
      const value = html`
        <div data-component-name="DigestPostEmbed" class="digestPostEmbed-flwiST">
          <a href="https://thereader.example.com/p/model-drop" rel="noopener" target="_blank">
            <div class="pencraft pc-display-flex pc-gap-16 pc-reset">
              <div style="width:70px;height:70px;" class="pencraft pc-reset">
                <img src="https://cdn.example.com/cover.jpeg" alt="Model Drop" width="140" height="140">
              </div>
              <div class="pencraft pc-display-flex pc-flexDirection-column pc-reset">
                <h4 class="pencraft pc-reset">Model Drop </h4>
                <div class="pencraft pc-display-flex pc-gap-4 pc-reset">
                  <div class="pencraft pc-reset">
                    <a href="https://substack.com/profile/8243895-author-name">Author name</a>
                  </div>
                  <div class="pencraft pc-reset">·</div>
                  <div class="pencraft pc-reset">October 5, 2025</div>
                </div>
                <a href="https://thereader.example.com/p/model-drop"><span>Read full story</span></a>
              </div>
            </div>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
        author: 'Author name',
        thumbnail: 'https://cdn.example.com/cover.jpeg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Reader extraction strips class attributes, so nothing may depend on them.
    it('should extract a card stripped of its classes', async () => {
      const value = html`
        <div data-component-name="DigestPostEmbed">
          <a href="https://thereader.example.com/p/model-drop">
            <div>
              <img src="https://cdn.example.com/cover.jpeg">
              <h4>Model Drop</h4>
            </div>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
        thumbnail: 'https://cdn.example.com/cover.jpeg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a byline that is not a profile link', async () => {
      const value = html`
        <div data-component-name="DigestPostEmbed">
          <a href="https://thereader.example.com/p/model-drop">
            <h4>Model Drop</h4>
            <a href="https://thereader.example.com/about">Author name</a>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'substack',
        url: 'https://thereader.example.com/p/model-drop',
        title: 'Model Drop',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should return undefined when the card has no anchor', async () => {
      const value = html`
        <div data-component-name="DigestPostEmbed">
          <h4>Model Drop</h4>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the card has no heading', async () => {
      const value = html`
        <div data-component-name="DigestPostEmbed">
          <a href="https://thereader.example.com/p/model-drop">Read full story</a>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('substackCrossPostCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, substackCrossPostCiteResolver)

  it('should extract all fields from a complete cross-post card', async () => {
    const value = makeContainer('embedded-post-wrap', {
      title: 'Why Does Everyone Hate AI?',
      url: 'https://thereader.example.com/p/why-does-everyone-hate-ai',
      truncated_body_text: 'A look at the backlash.',
      cover_image: 'https://cdn.example.com/cover.png',
      publication_name: 'The Reader',
      publication_logo_url: 'https://cdn.example.com/logo.png',
      bylines: [{ name: 'Author name', photo_url: 'https://cdn.example.com/author.png' }],
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

  it('should fall back to the byline photo when the publication has no logo', async () => {
    const value = makeContainer('embedded-post-wrap', {
      title: 'Model Drop',
      url: 'https://thereader.example.com/p/model-drop',
      bylines: [{ name: 'Author name', photo_url: 'https://cdn.example.com/author.png' }],
    })
    const expected: CiteResolverResult = {
      provider: 'substack',
      url: 'https://thereader.example.com/p/model-drop',
      title: 'Model Drop',
      author: 'Author name',
      icon: 'https://cdn.example.com/author.png',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore the own-post publishedBylines key', async () => {
    const value = makeContainer('embedded-post-wrap', {
      title: 'Model Drop',
      url: 'https://thereader.example.com/p/model-drop',
      publishedBylines: [{ name: 'Author name' }],
    })
    const expected: CiteResolverResult = {
      provider: 'substack',
      url: 'https://thereader.example.com/p/model-drop',
      title: 'Model Drop',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should not match the own-post class', async () => {
    const value = makeContainer('digest-post-embed', {
      title: 'Model Drop',
      canonical_url: 'https://thereader.example.com/p/model-drop',
    })

    expect(await extract(value)).toBeUndefined()
  })
})
