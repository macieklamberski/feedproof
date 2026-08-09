import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { appleEmbedResolver, appleResolveEmbed } from './apple.js'

describe('appleResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from an album player url', () => {
      const expected: EmbedResolverResult = {
        provider: 'applemusic',
        id: 'album/1440857781',
        src: 'https://embed.music.apple.com/us/album/thriller/1440857781',
        url: 'https://music.apple.com/us/album/thriller/1440857781',
        height: 450,
      }

      expect(
        appleResolveEmbed('https://embed.music.apple.com/us/album/thriller/1440857781'),
      ).toEqual(expected)
    })

    it('should take the track inside an album as the id', () => {
      const value = 'https://embed.music.apple.com/us/album/thriller/1440857781?i=1440857785'

      expect(appleResolveEmbed(value)).toMatchObject({
        id: 'album/1440857785',
        src: 'https://embed.music.apple.com/us/album/thriller/1440857781?i=1440857785',
      })
    })

    it('should resolve a playlist', () => {
      const value =
        'https://embed.music.apple.com/us/playlist/heard-in-apple-ads/pl.b28c3a5975b04436b42680595f6983ad'

      expect(appleResolveEmbed(value)).toMatchObject({
        id: 'playlist/pl.b28c3a5975b04436b42680595f6983ad',
      })
    })

    it('should resolve a podcast episode as its own provider', () => {
      const value =
        'https://embed.podcasts.apple.com/us/podcast/the-daily/id1200361736?i=1000123456789'

      expect(appleResolveEmbed(value)).toMatchObject({
        provider: 'applepodcasts',
        id: 'podcast/1000123456789',
        url: 'https://podcasts.apple.com/us/podcast/the-daily/id1200361736?i=1000123456789',
      })
    })

    it('should strip the id prefix from a show without an episode', () => {
      const value = 'https://embed.podcasts.apple.com/us/podcast/the-daily/id1200361736'

      expect(appleResolveEmbed(value)).toMatchObject({
        id: 'podcast/1200361736',
      })
    })

    it('should resolve a slug-less url', () => {
      const value = 'https://embed.music.apple.com/us/album/1440857781'

      expect(appleResolveEmbed(value)).toMatchObject({
        id: 'album/1440857781',
      })
    })
  })

  describe('edge cases', () => {
    it('should drop tracking parameters', () => {
      const value = 'https://embed.music.apple.com/us/album/thriller/1440857781?utm_source=feed'

      expect(appleResolveEmbed(value)).toMatchObject({
        src: 'https://embed.music.apple.com/us/album/thriller/1440857781',
      })
    })

    it('should return undefined for a kind that does not embed', () => {
      expect(appleResolveEmbed('https://music.apple.com/us/browse/1440857781')).toBeUndefined()
    })

    it('should return undefined for an id that is not an apple one', () => {
      expect(appleResolveEmbed('https://music.apple.com/us/album/thriller/abc')).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      expect(
        appleResolveEmbed('https://music.apple.com.evil.test/us/album/thriller/1440857781'),
      ).toBeUndefined()
    })

    it('should return undefined for an invalid url', () => {
      expect(appleResolveEmbed('not a url')).toBeUndefined()
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

    expect(await resolve(value)).toMatchObject({
      provider: 'applemusic',
      id: 'album/1440857781',
    })
  })

  it('should ignore a non-apple iframe', async () => {
    const value = '<iframe src="https://example.com/us/album/thriller/1440857781"></iframe>'

    expect(await resolve(value)).toBeUndefined()
  })
})
