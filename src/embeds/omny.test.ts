import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractOmnyClip, omnyEmbedResolver, omnyResolveEmbed } from './omny.js'

describe('extractOmnyClip', () => {
  it('should read a clip', () => {
    const value = 'https://omny.fm/shows/the-show/an-episode-title/embed?style=cover'
    const expected = 'the-show/an-episode-title'

    expect(extractOmnyClip(value)).toBe(expected)
  })

  it('should read a playlist', () => {
    const value = 'https://omny.fm/shows/the-show/playlists/highlights/embed'
    const expected = 'the-show/playlists/highlights'

    expect(extractOmnyClip(value)).toBe(expected)
  })

  it('should return undefined for a show page that is not an embed', () => {
    const value = 'https://omny.fm/shows/the-show'

    expect(extractOmnyClip(value)).toBeUndefined()
  })

  it('should return undefined when no clip is named', () => {
    const value = 'https://omny.fm/shows/embed'

    expect(extractOmnyClip(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractOmnyClip(value)).toBeUndefined()
  })
})

describe('omnyResolveEmbed', () => {
  // 180 was measured on players carrying these, so dropping one would state a height for a
  // player nobody asked for.
  it('should state the player height and keep the display options', () => {
    const value =
      'https://omny.fm/shows/the-show/an-episode/embed?media=audio&size=wide&style=cover'
    const expected: EmbedResolverResult = {
      provider: 'omny',
      id: 'the-show/an-episode',
      src: 'https://omny.fm/shows/the-show/an-episode/embed?media=audio&size=wide&style=cover',
      height: 180,
    }

    expect(omnyResolveEmbed(value)).toEqual(expected)
  })

  it('should keep a start offset', () => {
    const value = 'https://omny.fm/shows/the-show/an-episode/embed?t=70m40s'
    const expected: EmbedResolverResult = {
      provider: 'omny',
      id: 'the-show/an-episode',
      src: 'https://omny.fm/shows/the-show/an-episode/embed?t=70m40s',
      height: 180,
    }

    expect(omnyResolveEmbed(value)).toEqual(expected)
  })

  // Autoplay is the render hint's to offer on the click that loads the player, and tracking
  // parameters name nothing about the episode, so neither reaches the url every consumer gets.
  it('should drop autoplay and tracking parameters', () => {
    const value =
      'https://omny.fm/shows/the-show/an-episode/embed?style=cover&autoplay=1&utm_source=news'
    const expected: EmbedResolverResult = {
      provider: 'omny',
      id: 'the-show/an-episode',
      src: 'https://omny.fm/shows/the-show/an-episode/embed?style=cover',
      height: 180,
    }

    expect(omnyResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a omny url naming no clip', () => {
    const value = 'https://omny.fm/about'

    expect(omnyResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('omnyEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, omnyEmbedResolver)

  describe('happy paths', () => {
    it('should read the player off an iframe carrier', async () => {
      const value =
        '<iframe src="https://omny.fm/shows/the-show/an-episode/embed?style=cover"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'omny',
        id: 'the-show/an-episode',
        src: 'https://omny.fm/shows/the-show/an-episode/embed?style=cover',
        height: 180,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The carrier selector matches every iframe, so the host gate is the only thing that turns
    // this away, and a lookalike is the specimen that reaches it: host matching admits subdomains.
    it('should ignore a lookalike host carrying the clip path', async () => {
      const value =
        '<iframe src="https://omny.fm.evil.test/shows/the-show/an-episode/embed"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // 180 is what the markup usually states and what Omny's own oEmbed answers, but a publisher
    // who stated a box of their own outranks it.
    it('should take the size the carrier states over the player height', async () => {
      const value = html`
        <iframe
          src="https://omny.fm/shows/the-show/an-episode/embed"
          width="640"
          height="200"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'omny',
        id: 'the-show/an-episode',
        src: 'https://omny.fm/shows/the-show/an-episode/embed',
        width: 640,
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The placeholder's src is what every consumer of the feed gets, so what the query carries has to
// be asserted where it lands. The enclosure case is here for a different reason: injectEnclosures
// offers every attachment to every url-keyed resolver, and omny serves the episode audio from the
// same domain as the players, so only that path reaches the point where claiming a media url
// would cost a reader a playable element.
describeForEachParser('omny through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should place the clip without the autoplay the publisher wrote', async () => {
    const value = html`
      <iframe
        src="https://omny.fm/shows/the-show/an-episode/embed?style=cover&autoplay=1"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-src="https://omny.fm/shows/the-show/an-episode/embed?style=cover"
        data-embed-provider="omny"
        data-embed-id="the-show/an-episode"
        data-embed-height="180"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  it('should leave an omny audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://traffic.omny.fm/d/clips/05c002e0/8d774780/085556fd/audio.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://traffic.omny.fm/d/clips/05c002e0/8d774780/085556fd/audio.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
