import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { deezerEmbedResolver, deezerResolveEmbed } from './deezer.js'

describe('deezerResolveEmbed', () => {
  describe('happy paths', () => {
    it('should keep the theme the widget path already states', () => {
      const value = 'https://widget.deezer.com/widget/light/album/75337'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'album/75337',
        src: 'https://widget.deezer.com/widget/light/album/75337',
        url: 'https://www.deezer.com/album/75337',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should size a track shorter than a collection', () => {
      const value = 'https://widget.deezer.com/widget/dark/track/3135556'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/3135556',
        src: 'https://widget.deezer.com/widget/dark/track/3135556',
        url: 'https://www.deezer.com/track/3135556',
        height: 150,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/widget.deezer.com/widget/dark/track/3135556'

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a deezer url naming no resource', () => {
      const value = 'https://www.deezer.com/fr/the-beatles'

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a short link whose target is only known to deezer', () => {
      const value = 'https://link.deezer.com/s/33aBcDeF'

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a url that cannot be parsed', () => {
      const value = 'https://['

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should fall back to the share dialog theme when the stated one is unknown', () => {
      const value = 'https://widget.deezer.com/widget/purple/playlist/57888101'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'playlist/57888101',
        src: 'https://widget.deezer.com/widget/dark/playlist/57888101',
        url: 'https://www.deezer.com/playlist/57888101',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should refuse an id that is not a deezer id', () => {
      const value = 'https://widget.deezer.com/widget/dark/track/harder-better'

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse an artist, which the widget serves as a blank page', () => {
      const value = 'https://widget.deezer.com/widget/dark/artist/27'

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('Variant #1: the current widget frame', () => {
    it('should follow the auto theme through', () => {
      const value = 'https://widget.deezer.com/widget/auto/album/75337'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'album/75337',
        src: 'https://widget.deezer.com/widget/auto/album/75337',
        url: 'https://www.deezer.com/album/75337',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should take a podcast episode', () => {
      const value = 'https://widget.deezer.com/widget/dark/episode/494190077'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'episode/494190077',
        src: 'https://widget.deezer.com/widget/dark/episode/494190077',
        url: 'https://www.deezer.com/episode/494190077',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('Variant #2: the classic plugin player, which renders a not-found page', () => {
    it('should move an album onto the widget', () => {
      const value =
        'https://www.deezer.com/plugins/player?format=classic&autoplay=false&playlist=false&width=635&height=80&color=1990DB&layout=dark&size=medium&type=album&id=75337&app_id=1'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'album/75337',
        src: 'https://widget.deezer.com/widget/dark/album/75337',
        url: 'https://www.deezer.com/album/75337',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should read the plural spelling of a track', () => {
      const value = 'https://www.deezer.com/plugins/player?type=tracks&id=872090&app_id=1'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/872090',
        src: 'https://widget.deezer.com/widget/dark/track/872090',
        url: 'https://www.deezer.com/track/872090',
        height: 150,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should read a podcast as the show the widget serves', () => {
      const value = 'https://www.deezer.com/plugins/player?type=podcast&id=32049&app_id=1'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'show/32049',
        src: 'https://widget.deezer.com/widget/dark/show/32049',
        url: 'https://www.deezer.com/show/32049',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should step over the locale the site puts in front of the route', () => {
      const value = 'https://www.deezer.com/fr/plugins/player?type=playlist&id=57888101&app_id=1'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'playlist/57888101',
        src: 'https://widget.deezer.com/widget/dark/playlist/57888101',
        url: 'https://www.deezer.com/playlist/57888101',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should refuse a plugin url naming a type the widget does not serve', () => {
      const value = 'https://www.deezer.com/plugins/player?type=artist&id=27&app_id=1'

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('Variant #3: the Flash track players', () => {
    it('should read the second small widget', () => {
      const value =
        'https://www.deezer.com/embedded/small-widget-v2.swf?idSong=293366&colorBackground=0x009074&autoplay=0'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/293366',
        src: 'https://widget.deezer.com/widget/dark/track/293366',
        url: 'https://www.deezer.com/track/293366',
        height: 150,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should read the first small widget', () => {
      const value = 'https://www.deezer.com/embedded/small-widget.swf?idSong=293366'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/293366',
        src: 'https://widget.deezer.com/widget/dark/track/293366',
        url: 'https://www.deezer.com/track/293366',
        height: 150,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should read the single player on its own path', () => {
      const value = 'https://www.deezer.com/swf/singlePlayer.swf?idSong=1113961&autoplay=0'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/1113961',
        src: 'https://widget.deezer.com/widget/dark/track/1113961',
        url: 'https://www.deezer.com/track/1113961',
        height: 150,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should refuse a swf naming no song', () => {
      const value = 'https://www.deezer.com/embedded/small-widget-v2.swf?colorBackground=0x009074'

      expect(deezerResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('Variant #4: the Flash playlist players', () => {
    it('should read the playlist named by path', () => {
      const value = 'https://www.deezer.com/embedded/widget.swf?path=11969917&lang=EN'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'playlist/11969917',
        src: 'https://widget.deezer.com/widget/dark/playlist/11969917',
        url: 'https://www.deezer.com/playlist/11969917',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })

    it('should read the playlist named by pid', () => {
      const value = 'https://www.deezer.com/embed/player?pid=57888101&ap=0&ln=fr&sl=1'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'playlist/57888101',
        src: 'https://widget.deezer.com/widget/dark/playlist/57888101',
        url: 'https://www.deezer.com/playlist/57888101',
        height: 300,
      }

      expect(deezerResolveEmbed(value)).toEqual(expected)
    })
  })
})

describeForEachParser('deezerEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, deezerEmbedResolver)

  describe('happy paths', () => {
    it('should take the widget out of an iframe', async () => {
      const value = '<iframe src="https://widget.deezer.com/widget/dark/track/3135556"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/3135556',
        src: 'https://widget.deezer.com/widget/dark/track/3135556',
        url: 'https://www.deezer.com/track/3135556',
        height: 150,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the Flash player out of an embed', async () => {
      const value = html`
        <embed
          src="https://www.deezer.com/embedded/small-widget-v2.swf?idSong=293366"
          width="220"
          height="55"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/293366',
        src: 'https://widget.deezer.com/widget/dark/track/293366',
        url: 'https://www.deezer.com/track/293366',
        width: 220,
        height: 55,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/widget.deezer.com/widget/dark/track/3135556"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the size a publisher states', () => {
    // The box on the carrier is what the publisher chose for the player they embedded, so it
    // outranks the corpus-typical height. Deezer's own share dialog writes a fluid width, and
    // that is the shape the height alone describes.
    it('should let the carrier size win over the corpus-typical height', async () => {
      const value = html`
        <iframe
          src="https://widget.deezer.com/widget/dark/playlist/57888101"
          width="400"
          height="352"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'playlist/57888101',
        src: 'https://widget.deezer.com/widget/dark/playlist/57888101',
        url: 'https://www.deezer.com/playlist/57888101',
        width: 400,
        height: 352,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('shapes that are not a player', () => {
    // The snippet names the widget rather than the record, so there is nothing here worth
    // carrying onto the placeholder that the provider does not already say.
    it('should not take the snippet title as the record title', async () => {
      const value = html`
        <iframe
          title="deezer-widget"
          src="https://widget.deezer.com/widget/dark/track/3135556"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'deezer',
        id: 'track/3135556',
        src: 'https://widget.deezer.com/widget/dark/track/3135556',
        url: 'https://www.deezer.com/track/3135556',
        height: 150,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave a link to a deezer page for the generic fallback', async () => {
      const value = '<iframe src="https://www.deezer.com/fr/album/75337"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
