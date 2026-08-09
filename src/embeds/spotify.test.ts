import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { spotifyEmbedResolver, spotifyResolveEmbed } from './spotify.js'

describe('spotifyResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from a player url', () => {
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/4cOdK2wGLETKBW3PvgPWqT',
        src: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        height: 152,
      }

      expect(
        spotifyResolveEmbed(
          'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=oembed',
        ),
      ).toEqual(expected)
    })

    it('should give a collection the taller player height', () => {
      const value = 'https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3'

      expect(spotifyResolveEmbed(value)).toMatchObject({
        id: 'album/1DFixLWuPkv3KT3TnV35m3',
        height: 352,
      })
    })

    it('should resolve the older podcast player path', () => {
      const value = 'https://open.spotify.com/embed-podcast/episode/3POP8fAw3I2qhiIWIJEUNr'

      expect(spotifyResolveEmbed(value)).toMatchObject({
        src: 'https://open.spotify.com/embed/episode/3POP8fAw3I2qhiIWIJEUNr',
        height: 152,
      })
    })

    it('should resolve a localized page url', () => {
      const value = 'https://open.spotify.com/intl-fr/track/4cOdK2wGLETKBW3PvgPWqT'

      expect(spotifyResolveEmbed(value)).toMatchObject({
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      })
    })

    it('should resolve the legacy uri form', () => {
      const value = 'https://embed.spotify.com/?uri=spotify:track:4cOdK2wGLETKBW3PvgPWqT'

      expect(spotifyResolveEmbed(value)).toMatchObject({
        id: 'track/4cOdK2wGLETKBW3PvgPWqT',
        src: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
        height: 152,
      })
    })

    it('should ignore what follows the id', () => {
      const value = 'https://open.spotify.com/embed/show/4rOoJ6Egrf8K2IrywzwOMk/video'

      expect(spotifyResolveEmbed(value)).toMatchObject({
        src: 'https://open.spotify.com/embed/show/4rOoJ6Egrf8K2IrywzwOMk',
      })
    })
  })

  describe('edge cases', () => {
    it('should return undefined for a type that does not embed', () => {
      expect(
        spotifyResolveEmbed('https://open.spotify.com/user/4cOdK2wGLETKBW3PvgPWqT'),
      ).toBeUndefined()
    })

    it('should return undefined for an id that is not 22 characters', () => {
      expect(spotifyResolveEmbed('https://open.spotify.com/embed/track/abc')).toBeUndefined()
    })

    it('should return undefined for a legacy uri that names no id', () => {
      expect(spotifyResolveEmbed('https://embed.spotify.com/?uri=spotify:track')).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      expect(
        spotifyResolveEmbed('https://spotify.com.evil.test/embed/track/4cOdK2wGLETKBW3PvgPWqT'),
      ).toBeUndefined()
    })

    it('should return undefined for an invalid url', () => {
      expect(spotifyResolveEmbed('not a url')).toBeUndefined()
    })
  })
})

describeForEachParser('spotifyEmbedResolver', (parseHtml) => {
  const resolve = (value: string) => {
    const element = parseHtml(value).querySelector(spotifyEmbedResolver.selector) ?? undefined
    return element ? spotifyEmbedResolver.extract(element) : undefined
  }

  it('should resolve a spotify iframe', async () => {
    const value =
      '<iframe src="https://open.spotify.com/embed/episode/3POP8fAw3I2qhiIWIJEUNr" width="100%" height="152"></iframe>'

    expect(await resolve(value)).toMatchObject({
      provider: 'spotify',
      id: 'episode/3POP8fAw3I2qhiIWIJEUNr',
    })
  })

  it('should ignore a non-spotify iframe', async () => {
    const value = '<iframe src="https://example.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"></iframe>'

    expect(await resolve(value)).toBeUndefined()
  })
})
