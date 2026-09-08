import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractGeniallyViewId, geniallyEmbedResolver, geniallyResolveEmbed } from './genially.js'

const viewId = '60294f8b2ec856159ae0baa5'

describe('extractGeniallyViewId', () => {
  it('should read the id from the modern host', () => {
    const value = `https://view.genially.com/${viewId}`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  it('should read the id from the legacy host', () => {
    const value = `https://view.genial.ly/${viewId}`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  // WordPress embeds it with the fragment its own embed handler adds.
  it('should read the id from a url carrying a secret fragment', () => {
    const value = `https://view.genial.ly/${viewId}#?secret=5n2fsT8hDN`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  it('should read the id from a /view/ path', () => {
    const value = `https://genially.com/view/${viewId}`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  it('should return undefined for a genially url naming no view', () => {
    const value = 'https://genially.com/pricing'

    expect(extractGeniallyViewId(value)).toBeUndefined()
  })

  it('should return undefined for an id that is not the documented shape', () => {
    const value = 'https://view.genially.com/not-a-view-id'

    expect(extractGeniallyViewId(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractGeniallyViewId(value)).toBeUndefined()
  })
})

describe('geniallyResolveEmbed', () => {
  // The legacy host 301s to the modern one carrying the same id, so the hop is skippable.
  it('should mint the modern host from a legacy url', () => {
    const value = `https://view.genial.ly/${viewId}`
    const expected: EmbedResolverResult = {
      provider: 'genially',
      id: viewId,
      src: `https://view.genially.com/${viewId}`,
    }

    expect(geniallyResolveEmbed(value)).toEqual(expected)
  })

  it('should leave a modern url on its own host', () => {
    const value = `https://view.genially.com/${viewId}`
    const expected: EmbedResolverResult = {
      provider: 'genially',
      id: viewId,
      src: `https://view.genially.com/${viewId}`,
    }

    expect(geniallyResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a genially url naming no view', () => {
    const value = 'https://genially.com/pricing'

    expect(geniallyResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('geniallyEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, geniallyEmbedResolver)

  describe('happy paths', () => {
    it('should claim a view iframe on the modern host', async () => {
      const value = html`
        <iframe
          src="https://view.genially.com/60294f8b2ec856159ae0baa5"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'genially',
        id: '60294f8b2ec856159ae0baa5',
        src: 'https://view.genially.com/60294f8b2ec856159ae0baa5',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Neither exported function checks the host, so the legacy domain reaching the resolver at
    // all is what the second host list entry buys.
    it('should claim a view iframe on the legacy host', async () => {
      const value = html`
        <iframe
          src="https://view.genial.ly/60294f8b2ec856159ae0baa5"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'genially',
        id: '60294f8b2ec856159ae0baa5',
        src: 'https://view.genially.com/60294f8b2ec856159ae0baa5',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The id is read off the path with no host check of its own, so the host list is the only
    // thing between a lookalike domain and a minted Genially url.
    it('should ignore a lookalike host suffixing the view domain', async () => {
      const value =
        '<iframe src="https://view.genially.com.evil.test/60294f8b2ec856159ae0baa5"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the size a publisher states', () => {
    // Genially presentations are authored at whatever canvas the author picked, so the resolver
    // states no size and the publisher's box is the only measurement there is.
    it('should take the whole box the carrier states', async () => {
      const value = html`
        <iframe
          src="https://view.genially.com/60294f8b2ec856159ae0baa5"
          width="1200"
          height="675"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'genially',
        id: '60294f8b2ec856159ae0baa5',
        src: 'https://view.genially.com/60294f8b2ec856159ae0baa5',
        width: 1200,
        height: 675,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
