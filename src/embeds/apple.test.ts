import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { appleEmbedResolver, appleResolveEmbed } from './apple.js'

describe('appleResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from an album player url', () => {
      const value = 'https://embed.music.apple.com/us/album/thriller/1440857781'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'album/1440857781',
        src: 'https://embed.music.apple.com/us/album/thriller/1440857781',
        url: 'https://music.apple.com/us/album/thriller/1440857781',
        height: 450,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should take the track inside an album as the id and shorten the player', () => {
      const value = 'https://embed.music.apple.com/us/album/thriller/1440857781?i=1440857785'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'album/1440857785',
        src: 'https://embed.music.apple.com/us/album/thriller/1440857781?i=1440857785',
        url: 'https://music.apple.com/us/album/thriller/1440857781?i=1440857785',
        height: 175,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should give a standalone song the shorter player', () => {
      const value = 'https://embed.music.apple.com/us/song/beat-it/1440857797'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'song/1440857797',
        src: 'https://embed.music.apple.com/us/song/beat-it/1440857797',
        url: 'https://music.apple.com/us/song/beat-it/1440857797',
        height: 175,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should leave a music video without a height', () => {
      const value = 'https://embed.music.apple.com/us/music-video/beat-it/454551983'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'music-video/454551983',
        src: 'https://embed.music.apple.com/us/music-video/beat-it/454551983',
        url: 'https://music.apple.com/us/music-video/beat-it/454551983',
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve an artist', () => {
      const value = 'https://embed.music.apple.com/us/artist/michael-jackson/32940'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'artist/32940',
        src: 'https://embed.music.apple.com/us/artist/michael-jackson/32940',
        url: 'https://music.apple.com/us/artist/michael-jackson/32940',
        height: 450,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve a playlist', () => {
      const value =
        'https://embed.music.apple.com/us/playlist/heard-in-apple-ads/pl.b28c3a5975b04436b42680595f6983ad'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'playlist/pl.b28c3a5975b04436b42680595f6983ad',
        src: 'https://embed.music.apple.com/us/playlist/heard-in-apple-ads/pl.b28c3a5975b04436b42680595f6983ad',
        url: 'https://music.apple.com/us/playlist/heard-in-apple-ads/pl.b28c3a5975b04436b42680595f6983ad',
        height: 450,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve a podcast episode as its own provider', () => {
      const value =
        'https://embed.podcasts.apple.com/us/podcast/the-daily/id1200361736?i=1000123456789'
      const expected: EmbedResolverResult = {
        provider: 'applepodcasts',
        id: 'podcast/1000123456789',
        src: 'https://embed.podcasts.apple.com/us/podcast/the-daily/id1200361736?i=1000123456789',
        url: 'https://podcasts.apple.com/us/podcast/the-daily/id1200361736?i=1000123456789',
        height: 175,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should strip the id prefix from a show without an episode', () => {
      const value = 'https://embed.podcasts.apple.com/us/podcast/the-daily/id1200361736'
      const expected: EmbedResolverResult = {
        provider: 'applepodcasts',
        id: 'podcast/1200361736',
        src: 'https://embed.podcasts.apple.com/us/podcast/the-daily/id1200361736',
        url: 'https://podcasts.apple.com/us/podcast/the-daily/id1200361736',
        height: 450,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve a slug-less url', () => {
      const value = 'https://embed.music.apple.com/us/album/1440857781'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'album/1440857781',
        src: 'https://embed.music.apple.com/us/album/1440857781',
        url: 'https://music.apple.com/us/album/1440857781',
        height: 450,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should drop tracking parameters', () => {
      const value = 'https://embed.music.apple.com/us/album/thriller/1440857781?utm_source=feed'
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'album/1440857781',
        src: 'https://embed.music.apple.com/us/album/thriller/1440857781',
        url: 'https://music.apple.com/us/album/thriller/1440857781',
        height: 450,
      }

      expect(appleResolveEmbed(value)).toEqual(expected)
    })

    it('should return undefined for a kind that does not embed', () => {
      const value = 'https://music.apple.com/us/browse/1440857781'

      expect(appleResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not an apple one', () => {
      const value = 'https://music.apple.com/us/album/thriller/abc'

      expect(appleResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value = 'https://music.apple.com.evil.test/us/album/thriller/1440857781'

      expect(appleResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an invalid url', () => {
      const value = 'not a url'

      expect(appleResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('appleEmbedResolver', (parseHtml) => {
  const resolve = (value: string) => {
    const element = parseHtml(value).querySelector(appleEmbedResolver.selector) ?? undefined
    return element ? appleEmbedResolver.extract(element) : undefined
  }

  it('should resolve an apple music iframe', async () => {
    const value =
      '<iframe src="https://embed.music.apple.com/us/album/thriller/1440857781" height="450"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'applemusic',
      id: 'album/1440857781',
      src: 'https://embed.music.apple.com/us/album/thriller/1440857781',
      url: 'https://music.apple.com/us/album/thriller/1440857781',
      height: 450,
    }

    expect(await resolve(value)).toEqual(expected)
  })

  it('should ignore a non-apple iframe', async () => {
    const value = '<iframe src="https://example.com/us/album/thriller/1440857781"></iframe>'

    expect(await resolve(value)).toBeUndefined()
  })
})
