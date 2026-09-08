import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractLibsynEmbed, libsynEmbedResolver, libsynResolveEmbed } from './libsyn.js'

describe('extractLibsynEmbed', () => {
  it('should read an episode id and its height from the path', () => {
    const value =
      'https://html5-player.libsyn.com/embed/episode/id/5508311/height/90/width/700/theme/custom/'
    const expected = {
      kind: 'episode',
      id: '5508311',
      height: 90,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  it('should read the modern player host', () => {
    const value =
      'https://play.libsyn.com/embed/episode/id/41612765/height/192/theme/modern/size/large/'
    const expected = {
      kind: 'episode',
      id: '41612765',
      height: 192,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  it('should read a destination player', () => {
    const value = 'https://play.libsyn.com/embed/destination/id/12345/height/200/'
    const expected = {
      kind: 'destination',
      id: '12345',
      height: 200,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  // `show` reads like a kind and is not one. Given a real show id the player renders the same
  // "Episode Does Not Exist" error a nonsense kind renders, so minting it hands the reader an
  // error where the generic placeholder would at least be honest.
  it('should not read a show player, which does not exist', () => {
    const value = 'https://play.libsyn.com/embed/show/id/12345/height/200/'

    expect(extractLibsynEmbed(value)).toBeUndefined()
  })

  it('should read an embed that states no height', () => {
    const value = 'https://play.libsyn.com/embed/episode/id/5508311/'
    const expected = {
      kind: 'episode',
      id: '5508311',
      height: undefined,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a libsyn url that is not a player', () => {
    const value = 'https://traffic.libsyn.com/show/episode.mp3'

    expect(extractLibsynEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a non-numeric id', () => {
    const value = 'https://play.libsyn.com/embed/episode/id/abc/'

    expect(extractLibsynEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractLibsynEmbed(value)).toBeUndefined()
  })
})

describe('libsynResolveEmbed', () => {
  // The old host answers 500 for older episodes while play.libsyn.com serves them, so the
  // rebuilt src is a repair rather than a cosmetic rewrite.
  it('should mint the modern player host and carry the height', () => {
    const value = 'https://html5-player.libsyn.com/embed/episode/id/5508311/height/90/theme/custom/'
    const expected: EmbedResolverResult = {
      provider: 'libsyn',
      id: 'episode/5508311',
      src: 'https://play.libsyn.com/embed/episode/id/5508311/height/90/',
      height: 90,
    }

    expect(libsynResolveEmbed(value)).toEqual(expected)
  })

  it('should leave the height out when the player does not state one', () => {
    const value = 'https://play.libsyn.com/embed/episode/id/5508311/'
    const expected: EmbedResolverResult = {
      provider: 'libsyn',
      id: 'episode/5508311',
      src: 'https://play.libsyn.com/embed/episode/id/5508311/',
    }

    expect(libsynResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a libsyn url naming no episode', () => {
    const value = 'https://play.libsyn.com/about'

    expect(libsynResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('libsynEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, libsynEmbedResolver)

  describe('happy paths', () => {
    it('should read the player off an iframe carrier', async () => {
      const value =
        '<iframe src="https://html5-player.libsyn.com/embed/episode/id/5508311/height/90/"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'libsyn',
        id: 'episode/5508311',
        src: 'https://play.libsyn.com/embed/episode/id/5508311/height/90/',
        height: 90,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The carrier selector matches every iframe, so the host gate is the only thing that turns
    // this away, and a lookalike is the specimen that reaches it: host matching admits subdomains.
    it('should ignore a lookalike host carrying the player path', async () => {
      const value =
        '<iframe src="https://libsyn.com.evil.test/embed/episode/id/5508311/height/90/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // The publisher chose the box they embedded, so the carrier's size outranks the height the
    // player url spells, and it lands whole rather than merging with it.
    it('should take the size the carrier states over the height in the url', async () => {
      const value = html`
        <iframe
          src="https://play.libsyn.com/embed/episode/id/5508311/height/90/"
          width="640"
          height="200"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'libsyn',
        id: 'episode/5508311',
        src: 'https://play.libsyn.com/embed/episode/id/5508311/height/90/',
        width: 640,
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// injectEnclosures offers every attachment to every url-keyed resolver, and libsyn serves the
// episode audio from the same domain as the players, so only an enclosure test reaches the path
// where claiming a media url would cost a reader a playable element.
describeForEachParser('libsyn through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a libsyn audio enclosure playable', async () => {
    const enclosures = [
      { url: 'https://traffic.libsyn.com/secure/theshow/JDR_020418.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://traffic.libsyn.com/secure/theshow/JDR_020418.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
