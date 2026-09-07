import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractTedTalk, tedEmbedResolver, tedResolveEmbed } from './ted.js'

describe('extractTedTalk', () => {
  it('should read a talk slug', () => {
    const value = 'https://embed.ted.com/talks/ethan_zuckerman.html'
    const expected = 'ethan_zuckerman'

    expect(extractTedTalk(value)).toBe(expected)
  })

  // The localized player inserts the language between the slug and the path.
  it('should read a talk slug from the localized player', () => {
    const value = 'https://embed.ted.com/talks/lang/ja/ethan_zuckerman.html'
    const expected = 'ethan_zuckerman'

    expect(extractTedTalk(value)).toBe(expected)
  })

  it('should read a slug with no html suffix', () => {
    const value = 'https://embed.ted.com/talks/ethan_zuckerman'
    const expected = 'ethan_zuckerman'

    expect(extractTedTalk(value)).toBe(expected)
  })

  it('should return undefined for a ted url that is not a talk', () => {
    const value = 'https://www.ted.com/playlists/123/something'

    expect(extractTedTalk(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractTedTalk(value)).toBeUndefined()
  })
})

describe('tedResolveEmbed', () => {
  it('should derive the watch url from the slug', () => {
    const value = 'https://embed.ted.com/talks/lang/ja/ethan_zuckerman.html'
    const expected: EmbedResolverResult = {
      provider: 'ted',
      id: 'ethan_zuckerman',
      src: 'https://embed.ted.com/embed/ethan_zuckerman',
      url: 'https://www.ted.com/talks/ethan_zuckerman',
    }

    expect(tedResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a ted url naming no talk', () => {
    const value = 'https://embed.ted.com/about'

    expect(tedResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('tedEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, tedEmbedResolver)

  describe('happy paths', () => {
    it('should read a talk out of an iframe player', async () => {
      const value = '<iframe src="https://embed.ted.com/talks/ethan_zuckerman.html"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'ted',
        id: 'ethan_zuckerman',
        src: 'https://embed.ted.com/embed/ethan_zuckerman',
        url: 'https://www.ted.com/talks/ethan_zuckerman',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The selector matches on the carrier rather than on a substring, but a lookalike host is
    // still what the host guard exists to refuse.
    it('should ignore a foreign host serving the same player path', async () => {
      const value = html`
        <embed
          src="https://evil.test/video.ted.com/assets/player/swf/EmbedPlayer.swf"
          flashvars="adKeys=talk=ethan_zuckerman;year=2010"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  // The Flash player is one file for every talk, so the swf url names nothing and the talk sits
  // in the flashVars, in the ad targeting keys. The player is dead, so this is a repair.
  describe('the Flash player, and the talk hidden in its ad keys', () => {
    it('should recover the talk and the poster from the embed carrier', async () => {
      const value = html`
        <embed
          src="http://video.ted.com/assets/player/swf/EmbedPlayer.swf"
          flashvars="vu=http://video.ted.com/talk/stream/2010X/Blank/BreneBrown_2010X-320k.mp4&su=http://images.ted.com/images/ted/tedindex/embed-posters/BreneBrown-2010X.embed_thumbnail.jpg&vw=512&vh=288&adKeys=talk=brene_brown_on_vulnerability;year=2010;theme=how_the_mind_works"
          type="application/x-shockwave-flash"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'ted',
        id: 'brene_brown_on_vulnerability',
        src: 'https://embed.ted.com/embed/brene_brown_on_vulnerability',
        url: 'https://www.ted.com/talks/brene_brown_on_vulnerability',
        thumbnail:
          'http://images.ted.com/images/ted/tedindex/embed-posters/BreneBrown-2010X.embed_thumbnail.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The `<object>` dialect states the configuration in a sibling param rather than on the
    // carrier, and both spellings appear in the same snippet.
    it('should read the configuration out of a sibling param', async () => {
      const value = html`
        <object width="526" height="374">
          <param
            name="movie"
            value="http://video.ted.com/assets/player/swf/EmbedPlayer.swf"
          />
          <param
            name="flashvars"
            value="vw=512&vh=288&adKeys=talk=eben_bayer_are_mushrooms_the_new_plastic;year=2010"
          />
          <embed
            src="http://video.ted.com/assets/player/swf/EmbedPlayer.swf"
            type="application/x-shockwave-flash"
          />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'ted',
        id: 'eben_bayer_are_mushrooms_the_new_plastic',
        src: 'https://embed.ted.com/embed/eben_bayer_are_mushrooms_the_new_plastic',
        url: 'https://www.ted.com/talks/eben_bayer_are_mushrooms_the_new_plastic',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // TED cut the ad key off at 55 characters, so a slug that long is a prefix of the real one
    // and the player 404s on it. Refusing leaves the generic placeholder, which is honest.
    it('should refuse a slug sitting at the truncation cap', async () => {
      const value = html`
        <embed
          src="http://video.ted.com/assets/player/swf/EmbedPlayer.swf"
          flashvars="adKeys=talk=nicholas_christakis_the_hidden_influence_of_social_netw;year=2010"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should refuse a player whose configuration names no talk', async () => {
      const value = html`
        <embed
          src="http://video.ted.com/assets/player/swf/EmbedPlayer.swf"
          flashvars="vw=512&vh=288&adKeys=year=2010;theme=how_the_mind_works"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should refuse a player carrying no configuration at all', async () => {
      const value = '<embed src="http://video.ted.com/assets/player/swf/EmbedPlayer.swf" />'

      expect(await extract(value)).toBeUndefined()
    })

    // The poster is copied rather than composed, so it is taken only from TED's own hosts.
    it('should drop a poster served from somewhere other than TED', async () => {
      const value = html`
        <embed
          src="http://video.ted.com/assets/player/swf/EmbedPlayer.swf"
          flashvars="su=http://cdn.evil.test/poster.jpg&adKeys=talk=ethan_zuckerman;year=2010"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'ted',
        id: 'ethan_zuckerman',
        src: 'https://embed.ted.com/embed/ethan_zuckerman',
        url: 'https://www.ted.com/talks/ethan_zuckerman',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
