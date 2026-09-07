import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { bandcampEmbedResolver, extractBandcampRelease } from './bandcamp.js'

describe('extractBandcampRelease', () => {
  it('should read an album from the player path', () => {
    const value =
      'https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/bgcol=ffffff/transparent=true/'
    const expected = 'album/3373381116'

    expect(extractBandcampRelease(value)).toBe(expected)
  })

  it('should read a track from the player path', () => {
    const value = 'https://bandcamp.com/EmbeddedPlayer/track=42/size=small/'
    const expected = 'track/42'

    expect(extractBandcampRelease(value)).toBe(expected)
  })

  // The video player spells its options as a query string instead.
  it('should read a track from the video query', () => {
    const value = 'https://bandcamp.com/VideoEmbed?track=1959185434&bgcol=ffffff&linkcol=7137dc'
    const expected = 'track/1959185434'

    expect(extractBandcampRelease(value)).toBe(expected)
  })

  // A player pointing into an album names both, and whichever kind the url spells first is the
  // one the id keeps.
  it('should read the track from a track-within-album path', () => {
    const value =
      'https://bandcamp.com/EmbeddedPlayer/album=1578579597/size=large/artwork=small/track=1637967854/'
    const expected = 'track/1637967854'

    expect(extractBandcampRelease(value)).toBe(expected)
  })

  it('should read the track from the legacy path that names the album second', () => {
    const value =
      'https://bandcamp.com/EmbeddedPlayer/v=2/track=2747530839/album=2568747696/size=large/'
    const expected = 'track/2747530839'

    expect(extractBandcampRelease(value)).toBe(expected)
  })

  it('should return undefined when no release is named', () => {
    const value = 'https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=ffffff/'

    expect(extractBandcampRelease(value)).toBeUndefined()
  })

  it('should return undefined for a non-numeric id', () => {
    const value = 'https://bandcamp.com/VideoEmbed?track=abc'

    expect(extractBandcampRelease(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractBandcampRelease(value)).toBeUndefined()
  })
})

// Every preset name Bandcamp serves, paired with the height it lays out to. The names are
// written out here rather than read from `presetHeights`, and that duplication is the point:
// `tall_album` and `tall_track` sat in that map as keys Bandcamp never served, and a test
// walking the map would have fed `size=tall_album`, found the key and passed. Only a list of
// what the platform actually serves catches a dead one, so this list is the second source and
// must stay independent of the map. `tall` is absent because its height is keyed on the release.
const presetCases: Array<[string, number]> = [
  ['venti', 100],
  ['grande', 100],
  ['grande2', 355],
  ['grande3', 415],
  ['large', 470],
  ['medium', 120],
  ['small', 42],
  ['short', 23],
  ['tall2', 450],
]

describeForEachParser('bandcampEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, bandcampEmbedResolver)

  describe('happy paths', () => {
    // Bandcamp's own snippet carries the release page and label in a fallback anchor, which is
    // the only place either appears: the player url names the release by number alone.
    it('should read the canonical url and title from the fallback anchor', async () => {
      const value = html`
        <iframe
          src="https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/bgcol=ffffff/transparent=true/"
          seamless
        >
          <a href="http://myexpansiveawareness.bandcamp.com/album/do-you-wanna-be-rich">
            Do You Wanna Be Rich? by My Expansive Awareness
          </a>
        </iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/3373381116',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/',
        url: 'http://myexpansiveawareness.bandcamp.com/album/do-you-wanna-be-rich',
        height: 470,
        title: 'Do You Wanna Be Rich? by My Expansive Awareness',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Dropping the track leaves an album player, which opens on the album's first track rather
    // than the one the publisher linked.
    it('should keep the track a player opens an album at', async () => {
      const value = html`
        <iframe
          src="https://bandcamp.com/EmbeddedPlayer/album=1578579597/size=large/bgcol=333333/tracklist=false/artwork=small/track=1637967854/transparent=true/"
          seamless
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'track/1637967854',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=1578579597/track=1637967854/size=large/',
        height: 470,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The legacy player spells the track before the album, and means the same thing.
    it('should keep both releases when the legacy path names the track first', async () => {
      const value = html`
        <iframe
          src="https://bandcamp.com/EmbeddedPlayer/v=2/track=2747530839/album=2568747696/size=large/bgcol=ffffff/"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'track/2747530839',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=2568747696/track=2747530839/size=large/',
        height: 470,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the video player form for a video embed', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/VideoEmbed?track=1959185434&bgcol=ffffff"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'track/1959185434',
        src: 'https://bandcamp.com/VideoEmbed?track=1959185434',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // `VideoEmbed?album={id}` answers 404. Bandcamp's own video embeds always name a track, so
    // this arrives from hand-edited markup, and the audio player does serve the release.
    it('should fall back to the audio player when a video embed names only an album', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/VideoEmbed?album=2545703459"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/2545703459',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=2545703459/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should yield provider and id when no fallback anchor exists', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/EmbeddedPlayer/album=42/size=small/"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/42',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=42/size=small/',
        height: 42,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it.each(presetCases)('should state the height of the %s preset', async (preset, height) => {
      const value = html`
        <iframe src="https://bandcamp.com/EmbeddedPlayer/album=42/size=${preset}/"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/42',
        src: `https://bandcamp.com/EmbeddedPlayer/album=42/size=${preset}/`,
        height,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should size a tall album player by its own layout', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/EmbeddedPlayer/album=42/size=tall/"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/42',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=42/size=tall/',
        height: 295,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should size a tall track player shorter than a tall album one', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/EmbeddedPlayer/track=42/size=tall/"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'track/42',
        src: 'https://bandcamp.com/EmbeddedPlayer/track=42/size=tall/',
        height: 270,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A player naming both is an album player opened on the track, tracklist and all.
    it('should keep the album height when a tall player names both releases', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/EmbeddedPlayer/album=42/track=99/size=tall/"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'track/99',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=42/track=99/size=tall/',
        height: 295,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A name Bandcamp does not serve, which it answers with the `venti` document. Reading a
    // height off it would state the fallback's pixels for a player the publisher never chose.
    it('should state no height for a preset Bandcamp does not serve', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/EmbeddedPlayer/album=42/size=tall3/"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/42',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=42/size=tall3/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a player naming no release', async () => {
      const value = html`
        <iframe src="https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=ffffff/"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a carrier pointing somewhere else', async () => {
      const value = '<iframe src="https://example.com/EmbeddedPlayer/album=42/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
