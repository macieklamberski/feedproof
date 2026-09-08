import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractPodbeanId, podbeanEmbedResolver, podbeanResolveEmbed } from './podbean.js'

describe('extractPodbeanId', () => {
  it('should read the id from the legacy player path', () => {
    const value = 'https://www.podbean.com/media/player/yx4hr-f3d1e1?from=pb6admin&download=1'
    const expected = 'yx4hr-f3d1e1'

    expect(extractPodbeanId(value)).toBe(expected)
  })

  it('should read the id from the v2 player query', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&share=1&fonts=Arial'
    const expected = 'wyvke-1aefb6c-pb'

    expect(extractPodbeanId(value)).toBe(expected)
  })

  it('should return undefined for a podbean url naming no episode', () => {
    const value = 'https://www.podbean.com/pricing'

    expect(extractPodbeanId(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractPodbeanId(value)).toBeUndefined()
  })
})

describe('podbeanResolveEmbed', () => {
  // The legacy url 301s to the v2 player, so minting it repairs the embed and saves a redirect.
  it('should rewrite the legacy player to the v2 form', () => {
    const value = 'https://www.podbean.com/media/player/yx4hr-f3d1e1?from=pb6admin'
    const expected: EmbedResolverResult = {
      provider: 'podbean',
      id: 'yx4hr-f3d1e1',
      src: 'https://www.podbean.com/player-v2/?i=yx4hr-f3d1e1',
      height: 150,
    }

    expect(podbeanResolveEmbed(value)).toEqual(expected)
  })

  it('should keep a v2 id as written', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&skin=3'
    const expected: EmbedResolverResult = {
      provider: 'podbean',
      id: 'wyvke-1aefb6c-pb',
      src: 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb',
      height: 150,
    }

    expect(podbeanResolveEmbed(value)).toEqual(expected)
  })

  it('should prefer a height the url states', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&size=315'
    const expected: EmbedResolverResult = {
      provider: 'podbean',
      id: 'wyvke-1aefb6c-pb',
      src: 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb',
      height: 315,
    }

    expect(podbeanResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore a podbean url naming no episode', () => {
    const value = 'https://www.podbean.com/pricing'

    expect(podbeanResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('podbeanEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podbeanEmbedResolver)

  describe('happy paths', () => {
    it('should read the player off an iframe carrier', async () => {
      const value =
        '<iframe src="https://www.podbean.com/media/player/yx4hr-f3d1e1?from=pb6admin"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'podbean',
        id: 'yx4hr-f3d1e1',
        src: 'https://www.podbean.com/player-v2/?i=yx4hr-f3d1e1',
        height: 150,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The carrier selector matches every iframe, so the host gate is the only thing that turns
    // this away, and a lookalike is the specimen that reaches it: host matching admits subdomains.
    it('should ignore a lookalike host carrying the player path', async () => {
      const value =
        '<iframe src="https://podbean.com.evil.test/media/player/yx4hr-f3d1e1"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // Legacy markup states 122 for a player Podbean no longer serves, and the carrier still wins:
    // the size a publisher wrote outranks both the url's `size=` and the v2 player's own height.
    it('should take the size the carrier states over the one the url spells', async () => {
      const value = html`
        <iframe
          src="https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&size=315"
          width="640"
          height="122"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'podbean',
        id: 'wyvke-1aefb6c-pb',
        src: 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb',
        width: 640,
        height: 122,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// injectEnclosures offers every attachment to every url-keyed resolver, and podbean serves the
// episode audio from the same domain as the players, so only an enclosure test reaches the path
// where claiming a media url would cost a reader a playable element.
describeForEachParser('podbean through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a podbean audio enclosure playable', async () => {
    const enclosures = [
      { url: 'https://mcdn.podbean.com/mf/web/00snp9/221_Volume_e04.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://mcdn.podbean.com/mf/web/00snp9/221_Volume_e04.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
