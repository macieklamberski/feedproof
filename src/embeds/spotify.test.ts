import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
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

    // A playlist is named through its owner, so the type and id are the last pair in the uri
    // rather than the only one.
    it('should resolve a legacy uri naming a playlist through its owner', () => {
      const value =
        'https://embed.spotify.com/?uri=spotify:user:ga8:playlist:2QyFr1UfIduAkWZI0A5fnC'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'playlist/2QyFr1UfIduAkWZI0A5fnC',
        src: 'https://open.spotify.com/embed/playlist/2QyFr1UfIduAkWZI0A5fnC',
        url: 'https://open.spotify.com/playlist/2QyFr1UfIduAkWZI0A5fnC',
        height: 352,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    it('should resolve the same ownership spelled as a path', () => {
      const value = 'https://open.spotify.com/embed/user/ga8/playlist/2QyFr1UfIduAkWZI0A5fnC'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'playlist/2QyFr1UfIduAkWZI0A5fnC',
        src: 'https://open.spotify.com/embed/playlist/2QyFr1UfIduAkWZI0A5fnC',
        url: 'https://open.spotify.com/playlist/2QyFr1UfIduAkWZI0A5fnC',
        height: 352,
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
  const resolve = resolverExtractor(parseHtml, spotifyEmbedResolver)

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

  // The snippet states the item's name in the iframe title, prefixed with the widget's own name.
  it('should take the name out of the stated title', async () => {
    const value = html`
      <iframe
        src="https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t"
        title="Spotify Embed: Cemetry Gates - 2011 Remaster"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'spotify',
      id: 'track/03yOjwHoOPDlTUg0NRxN6t',
      src: 'https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t',
      url: 'https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t',
      height: 152,
      title: 'Cemetry Gates - 2011 Remaster',
    }

    expect(await resolve(value)).toEqual(expected)
  })

  describe('the card Substack hangs on the player', () => {
    it('should carry the artwork, the name and the act across', async () => {
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs='{"image":"https://i.scdn.co/image/ab67616d0000b273","title":"Cemetry Gates","subtitle":"The Smiths","description":"","url":"https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t"}'
          src="https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t"
          data-component-name="Spotify2ToDOM"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/03yOjwHoOPDlTUg0NRxN6t',
        src: 'https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t',
        url: 'https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t',
        height: 152,
        title: 'Cemetry Gates',
        author: 'The Smiths',
        thumbnail: 'https://i.scdn.co/image/ab67616d0000b273',
      }

      expect(await resolve(value)).toEqual(expected)
    })

    // The card prints the type where a description would go, which the id already states.
    it('should state no description when the card holds only the type', async () => {
      const value = html`
        <iframe
          class="spotify-wrap podcast"
          data-attrs='{"title":"An interview","subtitle":"A host","description":"Episode"}'
          src="https://open.spotify.com/embed/episode/1taJsFyMEbsljV14QAt409"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'episode/1taJsFyMEbsljV14QAt409',
        src: 'https://open.spotify.com/embed/episode/1taJsFyMEbsljV14QAt409',
        url: 'https://open.spotify.com/episode/1taJsFyMEbsljV14QAt409',
        height: 152,
        title: 'An interview',
        author: 'A host',
      }

      expect(await resolve(value)).toEqual(expected)
    })

    it('should keep a description that says something the type does not', async () => {
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs='{"title":"A memoir","description":"Nine years since it came out"}'
          src="https://open.spotify.com/embed/episode/1taJsFyMEbsljV14QAt409"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'episode/1taJsFyMEbsljV14QAt409',
        src: 'https://open.spotify.com/embed/episode/1taJsFyMEbsljV14QAt409',
        url: 'https://open.spotify.com/episode/1taJsFyMEbsljV14QAt409',
        height: 152,
        title: 'A memoir',
        description: 'Nine years since it came out',
      }

      expect(await resolve(value)).toEqual(expected)
    })

    // An artwork url is only trusted when it comes from Spotify's own image host.
    it('should ignore artwork hosted somewhere else', async () => {
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs='{"title":"A track","image":"https://evil.test/i.scdn.co/image/x"}'
          src="https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/03yOjwHoOPDlTUg0NRxN6t',
        src: 'https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t',
        url: 'https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t',
        height: 152,
        title: 'A track',
      }

      expect(await resolve(value)).toEqual(expected)
    })
  })

  it('should ignore a non-spotify iframe', async () => {
    const value = '<iframe src="https://example.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"></iframe>'

    expect(await resolve(value)).toBeUndefined()
  })
})
