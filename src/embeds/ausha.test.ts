import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { aushaEmbedResolver, aushaResolveEmbed } from './ausha.js'

describe('aushaResolveEmbed', () => {
  describe('happy paths', () => {
    it('should take the episode and the measured height off the player', () => {
      const value = 'https://player.ausha.co/?podcastId=BGKwJUJG8D9m&color=%23001B2D&v=3'
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/BGKwJUJG8D9m',
        src: 'https://player.ausha.co/?podcastId=BGKwJUJG8D9m&color=%23001B2D&v=3',
        height: 220,
      }

      expect(aushaResolveEmbed(value)).toEqual(expected)
    })

    it('should read the player spelled as index.html', () => {
      const value = 'https://player.ausha.co/index.html?podcastId=b3GxmHMGPEaQ&v=3'
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/b3GxmHMGPEaQ',
        src: 'https://player.ausha.co/index.html?podcastId=b3GxmHMGPEaQ&v=3',
        height: 220,
      }

      expect(aushaResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/player.ausha.co/?podcastId=BGKwJUJG8D9m'

      expect(aushaResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore an ausha host that is not a player', () => {
      const value = 'https://podcast.ausha.co/comicsdiscovery?podcastId=BGKwJUJG8D9m'

      expect(aushaResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a player url naming nothing', () => {
      const value = 'https://player.ausha.co/?color=%23001B2D&v=3'

      expect(aushaResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a url that cannot be parsed', () => {
      const value = 'https://['

      expect(aushaResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should refuse an id of the wrong length', () => {
      const value = 'https://player.ausha.co/?podcastId=BGKwJUJG&v=3'

      expect(aushaResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse a path on the player host that is not the player', () => {
      const value = 'https://player.ausha.co/ausha-player.js?podcastId=BGKwJUJG8D9m'

      expect(aushaResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('what the frame names, when it names two things', () => {
    it('should take the episode over the show it belongs to', () => {
      const value =
        'https://player.ausha.co/?showId=4qgQzfO219p2&podcastId=YK049s1DdWXX&t=0&v=3&playerId=ausha-vZGt'
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/YK049s1DdWXX',
        src: 'https://player.ausha.co/?showId=4qgQzfO219p2&podcastId=YK049s1DdWXX&t=0&v=3&playerId=ausha-vZGt',
        height: 220,
      }

      expect(aushaResolveEmbed(value)).toEqual(expected)
    })

    it('should fall back to the show where no episode is named', () => {
      const value = 'https://player.ausha.co/?showId=4qgQzfO219p2&multishow=false&v=3'
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'show/4qgQzfO219p2',
        src: 'https://player.ausha.co/?showId=4qgQzfO219p2&multishow=false&v=3',
        height: 220,
      }

      expect(aushaResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('the two shapes the player draws', () => {
    it('should give the vertical player its taller box', () => {
      const value =
        'https://player.ausha.co/?podcastId=yknWu4dagvGo&display=vertical&showId=yXGrf5edXR3o&v=3'
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/yknWu4dagvGo',
        src: 'https://player.ausha.co/?podcastId=yknWu4dagvGo&display=vertical&showId=yXGrf5edXR3o&v=3',
        height: 501,
      }

      expect(aushaResolveEmbed(value)).toEqual(expected)
    })

    it('should give the horizontal player the usual box', () => {
      const value = 'https://player.ausha.co/?podcastId=yknWu4dagvGo&display=horizontal&v=3'
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/yknWu4dagvGo',
        src: 'https://player.ausha.co/?podcastId=yknWu4dagvGo&display=horizontal&v=3',
        height: 220,
      }

      expect(aushaResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('the older widget, which states its own height', () => {
    // Its height moves with what it holds, so every one of the 33 corpus frames declares one and
    // the resolver states none of its own.
    it('should claim the widget without stating a height', () => {
      const value =
        'https://widget.ausha.co/index.html?chanId=y8wm8Tlwvv5L&showId=b7z8KuEkzXPd&display=horizontal&v=2&height=200px&mode=latest'
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'show/b7z8KuEkzXPd',
        src: 'https://widget.ausha.co/index.html?chanId=y8wm8Tlwvv5L&showId=b7z8KuEkzXPd&display=horizontal&v=2&height=200px&mode=latest',
      }

      expect(aushaResolveEmbed(value)).toEqual(expected)
    })
  })
})

describeForEachParser('aushaEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, aushaEmbedResolver)

  describe('happy paths', () => {
    it('should take the player out of an iframe', async () => {
      const value = html`
        <iframe
          name="Ausha Podcast Player"
          src="https://player.ausha.co/?podcastId=BGKwJUJG8D9m&amp;v=3"
          height="220"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/BGKwJUJG8D9m',
        src: 'https://player.ausha.co/?podcastId=BGKwJUJG8D9m&v=3',
        height: 220,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // 74 of the 263 player frames in the corpus declare no height at all and size themselves from
    // an inline style, which is what makes the measurement worth carrying.
    it('should supply the height a frame with no box does not state', async () => {
      const value = html`
        <iframe
          src="https://player.ausha.co/?podcastId=BGKwJUJG8D9m&amp;v=3"
          style="border: none; width:100%; height:220px"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/BGKwJUJG8D9m',
        src: 'https://player.ausha.co/?podcastId=BGKwJUJG8D9m&v=3',
        height: 220,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/player.ausha.co/?podcastId=BGKwJUJG8D9m"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the size a publisher states', () => {
    it('should let the carrier box win over the measured one', async () => {
      const value = html`
        <iframe
          src="https://player.ausha.co/?podcastId=BGKwJUJG8D9m&amp;display=vertical&amp;v=3"
          width="100%"
          height="420"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'ausha',
        id: 'podcast/BGKwJUJG8D9m',
        src: 'https://player.ausha.co/?podcastId=BGKwJUJG8D9m&display=vertical&v=3',
        height: 420,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The resolver only reaches a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('ausha through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  // `audio.ausha.co` is where every Ausha feed's episode audio sits, and the file is named with
  // the same twelve characters the player takes as its `podcastId`. Listing `ausha.co` claims
  // that host, so only the check that the frame sits on the player itself keeps the audio.
  it('should claim a player frame the default list reaches', async () => {
    const value = '<iframe src="https://player.ausha.co/?podcastId=BGKwJUJG8D9m&amp;v=3"></iframe>'
    const expected = html`
      <div
        data-embed-id="podcast/BGKwJUJG8D9m"
        data-embed-provider="ausha"
        data-embed-src="https://player.ausha.co/?podcastId=BGKwJUJG8D9m&amp;v=3"
        data-embed-height="220"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  it('should leave an ausha audio enclosure playable', async () => {
    const enclosures = [{ url: 'https://audio.ausha.co/BGKwJUJG8D9m.mp3?t=1', type: 'audio/mpeg' }]

    const expected = html`
      <audio data-enclosure="" controls src="https://audio.ausha.co/BGKwJUJG8D9m.mp3?t=1"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
