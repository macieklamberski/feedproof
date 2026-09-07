import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { audiomackEmbedResolver, audiomackResolveEmbed } from './audiomack.js'

describe('audiomackResolveEmbed', () => {
  describe('happy paths', () => {
    it('should read a song off the canonical path', () => {
      const value = 'https://audiomack.com/embed/larrynorman/song/burn-2'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'larrynorman/song/burn-2',
        src: 'https://audiomack.com/embed/larrynorman/song/burn-2',
        url: 'https://audiomack.com/larrynorman/song/burn-2',
        height: 252,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })

    it('should size an album taller than a song', () => {
      const value = 'https://audiomack.com/embed/chuuwee/album/cool-world'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'chuuwee/album/cool-world',
        src: 'https://audiomack.com/embed/chuuwee/album/cool-world',
        url: 'https://audiomack.com/chuuwee/album/cool-world',
        height: 400,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/audiomack.com/embed/larrynorman/song/burn-2'

      expect(audiomackResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore an audiomack url naming no player', () => {
      const value = 'https://audiomack.com/search?q=burn'

      expect(audiomackResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a url that cannot be parsed', () => {
      const value = 'https://['

      expect(audiomackResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should refuse a kind the player does not have', () => {
      const value = 'https://audiomack.com/embed/larrynorman/mixtape/burn-2'

      expect(audiomackResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse an embed path with no slug', () => {
      const value = 'https://audiomack.com/embed/larrynorman/song'

      expect(audiomackResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse a slug that is not one', () => {
      const value = 'https://audiomack.com/embed/larrynorman/song/burn.2%2Fother'

      expect(audiomackResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('Variant #1: the two orders the current player accepts', () => {
    it('should write the kind-first spelling out to the canonical one', () => {
      const value = 'https://audiomack.com/embed/song/larrynorman/burn-2'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'larrynorman/song/burn-2',
        src: 'https://audiomack.com/embed/larrynorman/song/burn-2',
        url: 'https://audiomack.com/larrynorman/song/burn-2',
        height: 252,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the parameters the current player takes', () => {
      const value = 'https://audiomack.com/embed/song/mlgmusiz/new-year-new-glory?background=1'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'mlgmusiz/song/new-year-new-glory',
        src: 'https://audiomack.com/embed/mlgmusiz/song/new-year-new-glory?background=1',
        url: 'https://audiomack.com/mlgmusiz/song/new-year-new-glory',
        height: 252,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })

    it('should take a playlist at the album height', () => {
      const value = 'https://audiomack.com/embed/playlist/team-bigga-rankin/paper'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'team-bigga-rankin/playlist/paper',
        src: 'https://audiomack.com/embed/team-bigga-rankin/playlist/paper',
        url: 'https://audiomack.com/team-bigga-rankin/playlist/paper',
        height: 400,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('Variant #2: the retired players, which the route word alone types', () => {
    it('should read embed3 as a song', () => {
      const value = 'http://www.audiomack.com/embed3/hhs1987/pound-cake-freestyle-2?c1=fc881e'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'hhs1987/song/pound-cake-freestyle-2',
        src: 'https://audiomack.com/embed/hhs1987/song/pound-cake-freestyle-2',
        url: 'https://audiomack.com/hhs1987/song/pound-cake-freestyle-2',
        height: 252,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })

    it('should read embed3-album as an album', () => {
      const value = 'http://www.audiomack.com/embed3-album/chuuwee/cool-world?c1=00ffff&bg=f2f2f2'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'chuuwee/album/cool-world',
        src: 'https://audiomack.com/embed/chuuwee/album/cool-world',
        url: 'https://audiomack.com/chuuwee/album/cool-world',
        height: 400,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })

    it('should read embed4-large as a song', () => {
      const value = 'http://www.audiomack.com/embed4-large/costill8nine/happy-dirty'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'costill8nine/song/happy-dirty',
        src: 'https://audiomack.com/embed/costill8nine/song/happy-dirty',
        url: 'https://audiomack.com/costill8nine/song/happy-dirty',
        height: 252,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })

    it('should read embed4-album as an album', () => {
      const value =
        'http://www.audiomack.com/embed4-album/creative-soul-music-group-1/satisfaction-ep'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'creative-soul-music-group-1/album/satisfaction-ep',
        src: 'https://audiomack.com/embed/creative-soul-music-group-1/album/satisfaction-ep',
        url: 'https://audiomack.com/creative-soul-music-group-1/album/satisfaction-ep',
        height: 400,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })

    it('should drop the retired colour parameters, which the current player ignores', () => {
      const value = 'http://www.audiomack.com/embed4/jhoss/til-the-morn?c1=fc881e&bg=f2f2f2'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'jhoss/song/til-the-morn',
        src: 'https://audiomack.com/embed/jhoss/song/til-the-morn',
        url: 'https://audiomack.com/jhoss/song/til-the-morn',
        height: 252,
      }

      expect(audiomackResolveEmbed(value)).toEqual(expected)
    })
  })
})

describeForEachParser('audiomackEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, audiomackEmbedResolver)

  describe('happy paths', () => {
    it('should take the player out of an iframe', async () => {
      const value =
        '<iframe src="https://audiomack.com/embed/song/larrynorman/burn-2?background=1"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'larrynorman/song/burn-2',
        src: 'https://audiomack.com/embed/larrynorman/song/burn-2?background=1',
        url: 'https://audiomack.com/larrynorman/song/burn-2',
        height: 252,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Some publisher tooling wrote the path with a doubled slash. Audiomack normalizes it and so
    // does the parser, so it resolves like any other frame.
    it('should read a doubled slash in the path', async () => {
      const value = '<iframe src="https://audiomack.com//embed/billnass/song/hallo"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'billnass/song/hallo',
        src: 'https://audiomack.com/embed/billnass/song/hallo',
        url: 'https://audiomack.com/billnass/song/hallo',
        height: 252,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/audiomack.com/embed/larrynorman/song/burn-2"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the size a publisher states', () => {
    it('should let the carrier size win over the corpus-typical height', async () => {
      const value = html`
        <iframe
          src="https://audiomack.com/embed/chuuwee/album/cool-world"
          width="649"
          height="1200"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'audiomack',
        id: 'chuuwee/album/cool-world',
        src: 'https://audiomack.com/embed/chuuwee/album/cool-world',
        url: 'https://audiomack.com/chuuwee/album/cool-world',
        width: 649,
        height: 1200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The resolver only reaches a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('audiomack through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim a player frame the default list reaches', async () => {
    const value = '<iframe src="https://audiomack.com/embed/chuuwee/album/cool-world"></iframe>'
    const expected = html`
      <div
        data-embed-id="chuuwee/album/cool-world"
        data-embed-provider="audiomack"
        data-embed-src="https://audiomack.com/embed/chuuwee/album/cool-world"
        data-embed-url="https://audiomack.com/chuuwee/album/cool-world"
        data-embed-height="400"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // Audiomack streams from `music.audiomack.com`, an artist and a slug deep just like the embed
  // route, and listing `audiomack.com` claims it. Only the route word keeps the audio playable.
  it('should leave an audiomack audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://music.audiomack.com/streaming/chuuwee/cool-world.mp3?Expires=1',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://music.audiomack.com/streaming/chuuwee/cool-world.mp3?Expires=1"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
