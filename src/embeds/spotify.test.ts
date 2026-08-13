import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { spotifyEmbedResolver, spotifyResolveEmbed } from './spotify.js'

describe('spotifyResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from a player url', () => {
      const value = 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=oembed'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/4cOdK2wGLETKBW3PvgPWqT',
        src: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        height: 152,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    it('should give a collection the taller player height', () => {
      const value = 'https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'album/1DFixLWuPkv3KT3TnV35m3',
        src: 'https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3',
        url: 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3',
        height: 352,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve the older podcast player path', () => {
      const value = 'https://open.spotify.com/embed-podcast/episode/3POP8fAw3I2qhiIWIJEUNr'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'episode/3POP8fAw3I2qhiIWIJEUNr',
        src: 'https://open.spotify.com/embed/episode/3POP8fAw3I2qhiIWIJEUNr',
        url: 'https://open.spotify.com/episode/3POP8fAw3I2qhiIWIJEUNr',
        height: 152,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve a localized page url', () => {
      const value = 'https://open.spotify.com/intl-fr/track/4cOdK2wGLETKBW3PvgPWqT'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/4cOdK2wGLETKBW3PvgPWqT',
        src: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        height: 152,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve the legacy uri form', () => {
      const value = 'https://embed.spotify.com/?uri=spotify:track:4cOdK2wGLETKBW3PvgPWqT'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/4cOdK2wGLETKBW3PvgPWqT',
        src: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        height: 152,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    it('should ignore what follows the id', () => {
      const value = 'https://open.spotify.com/embed/show/4rOoJ6Egrf8K2IrywzwOMk/video'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'show/4rOoJ6Egrf8K2IrywzwOMk',
        src: 'https://open.spotify.com/embed/show/4rOoJ6Egrf8K2IrywzwOMk',
        url: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
        height: 152,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined for a type that does not embed', () => {
      const value = 'https://open.spotify.com/user/4cOdK2wGLETKBW3PvgPWqT'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not 22 characters', () => {
      const value = 'https://open.spotify.com/embed/track/abc'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a legacy uri that names no id', () => {
      const value = 'https://embed.spotify.com/?uri=spotify:track'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value = 'https://spotify.com.evil.test/embed/track/4cOdK2wGLETKBW3PvgPWqT'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an invalid url', () => {
      const value = 'not a url'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
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
    const expected: EmbedResolverResult = {
      provider: 'spotify',
      id: 'episode/3POP8fAw3I2qhiIWIJEUNr',
      src: 'https://open.spotify.com/embed/episode/3POP8fAw3I2qhiIWIJEUNr',
      url: 'https://open.spotify.com/episode/3POP8fAw3I2qhiIWIJEUNr',
      height: 152,
    }

    expect(await resolve(value)).toEqual(expected)
  })

  it('should ignore a non-spotify iframe', async () => {
    const value = '<iframe src="https://example.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"></iframe>'

    expect(await resolve(value)).toBeUndefined()
  })
})
