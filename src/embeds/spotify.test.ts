import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, jsonAttrValue, resolverExtractor } from '../tests.js'
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

    it('should read an id longer than the 22 characters Spotify mints today', () => {
      const value = 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqTx'
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/4cOdK2wGLETKBW3PvgPWqTx',
        src: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqTx',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqTx',
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

    // The parameter also carries an ordinary open.spotify.com url. It is read by the same path
    // reader as the carrier, so every spelling the carrier's path has, it has too.
    it.each([
      'https://open.spotify.com/track/2ikQOoW9SMmgec0xdU94B0',
      'https://open.spotify.com/intl-de/track/2ikQOoW9SMmgec0xdU94B0',
      'https://open.spotify.com/embed/track/2ikQOoW9SMmgec0xdU94B0',
      'https://OPEN.SPOTIFY.COM/track/2ikQOoW9SMmgec0xdU94B0',
    ])('should resolve a uri parameter holding the url %s', (uri) => {
      const value = `https://open.spotify.com/embed?uri=${encodeURIComponent(uri)}`
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/2ikQOoW9SMmgec0xdU94B0',
        src: 'https://open.spotify.com/embed/track/2ikQOoW9SMmgec0xdU94B0',
        url: 'https://open.spotify.com/track/2ikQOoW9SMmgec0xdU94B0',
        height: 152,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    // The ownership form, which this file already reads in the other two spellings.
    it('should resolve a uri url naming a playlist through its owner', () => {
      const uri = 'https://open.spotify.com/user/ga8/playlist/2QyFr1UfIduAkWZI0A5fnC'
      const value = `https://open.spotify.com/embed?uri=${encodeURIComponent(uri)}`
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'playlist/2QyFr1UfIduAkWZI0A5fnC',
        src: 'https://open.spotify.com/embed/playlist/2QyFr1UfIduAkWZI0A5fnC',
        url: 'https://open.spotify.com/playlist/2QyFr1UfIduAkWZI0A5fnC',
        height: 352,
      }

      expect(spotifyResolveEmbed(value)).toEqual(expected)
    })

    // The type and id are taken as a pair. A path naming a type but no id must not borrow the
    // parameter's id, which would mint one resource's id under another's type and height.
    it('should not mix a type from the path with an id from the parameter', () => {
      const uri = 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3'
      const value = `https://open.spotify.com/embed/track?uri=${encodeURIComponent(uri)}`

      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'album/1DFixLWuPkv3KT3TnV35m3',
        src: 'https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3',
        url: 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3',
        height: 352,
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
    it('should return undefined for a uri url on another host', () => {
      const uri = 'https://example.com/track/2ikQOoW9SMmgec0xdU94B0'
      const value = `https://open.spotify.com/embed?uri=${encodeURIComponent(uri)}`

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a type that does not embed', () => {
      const value = 'https://open.spotify.com/user/4cOdK2wGLETKBW3PvgPWqT'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a two-segment route that is not a type', () => {
      const value = 'https://open.spotify.com/concert/38rJfCcp1DPmGqDbYE3xoR'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a type naming an inherited method', () => {
      const value = 'https://open.spotify.com/embed/toString/4uLU6hMCjMI75M1A2tKUQC'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a type naming the prototype itself', () => {
      const value = 'https://open.spotify.com/embed/__proto__/4uLU6hMCjMI75M1A2tKUQC'

      expect(spotifyResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a path naming a type and no id', () => {
      const value = 'https://open.spotify.com/embed/track'

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
  const extract = resolverExtractor(parseHtml, spotifyEmbedResolver)

  it('should resolve a spotify iframe', async () => {
    const value = html`
      <iframe
        src="https://open.spotify.com/embed/episode/3POP8fAw3I2qhiIWIJEUNr"
        width="100%"
        height="152"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'spotify',
      id: 'episode/3POP8fAw3I2qhiIWIJEUNr',
      src: 'https://open.spotify.com/embed/episode/3POP8fAw3I2qhiIWIJEUNr',
      url: 'https://open.spotify.com/episode/3POP8fAw3I2qhiIWIJEUNr',
      height: 152,
    }

    expect(await extract(value)).toEqual(expected)
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

    expect(await extract(value)).toEqual(expected)
  })

  describe('the card Substack hangs on the player', () => {
    it('should carry the artwork, the name and the act across', async () => {
      const trackCardAttrs = jsonAttrValue({
        image: 'https://i.scdn.co/image/ab67616d0000b273',
        title: 'Cemetry Gates',
        subtitle: 'The Smiths',
        description: '',
        url: 'https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t',
      })
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs="${trackCardAttrs}"
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

      expect(await extract(value)).toEqual(expected)
    })

    // A personal name sits in this slot on about a third of real show cards and is still the
    // publisher Spotify's own show page prints, so it does not make the field an author.
    it('should carry a show card act as the publisher', async () => {
      const showCardAttrs = jsonAttrValue({
        image: 'https://i.scdn.co/image/ab6765630000ba8a67fda8c427b5b687fc2e1122',
        title: 'History Impossible',
        subtitle: 'Alexander von Sternberg',
        description: 'Podcast',
        url: 'https://open.spotify.com/show/5t2HrBMNFX4WtSTERcopCF',
      })
      const value = html`
        <iframe
          class="spotify-wrap podcast"
          data-attrs="${showCardAttrs}"
          src="https://open.spotify.com/embed/show/5t2HrBMNFX4WtSTERcopCF"
          data-component-name="Spotify2ToDOM"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'show/5t2HrBMNFX4WtSTERcopCF',
        src: 'https://open.spotify.com/embed/show/5t2HrBMNFX4WtSTERcopCF',
        url: 'https://open.spotify.com/show/5t2HrBMNFX4WtSTERcopCF',
        height: 152,
        title: 'History Impossible',
        publisher: 'Alexander von Sternberg',
        thumbnail: 'https://i.scdn.co/image/ab6765630000ba8a67fda8c427b5b687fc2e1122',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // An episode card states the publisher of the show it ran in, which Spotify's show page for
    // The Land Behind prints as `Podcast · Peter Holliday`. The card names no author of its own.
    it('should carry an episode card act as the publisher', async () => {
      const episodeCardAttrs = jsonAttrValue({
        image: 'https://i.scdn.co/image/ab6765630000ba8a9f41b6a60769dfb6bd6b41e7',
        title: '2. Tim Ingold: Ecologies of Perception',
        subtitle: 'Peter Holliday',
        description: 'Episode',
        url: 'https://open.spotify.com/episode/2UkLIeyl69vt0cVJcqLljy',
      })
      const value = html`
        <iframe
          class="spotify-wrap podcast"
          data-attrs="${episodeCardAttrs}"
          src="https://open.spotify.com/embed/episode/2UkLIeyl69vt0cVJcqLljy"
          data-component-name="Spotify2ToDOM"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'episode/2UkLIeyl69vt0cVJcqLljy',
        src: 'https://open.spotify.com/embed/episode/2UkLIeyl69vt0cVJcqLljy',
        url: 'https://open.spotify.com/episode/2UkLIeyl69vt0cVJcqLljy',
        height: 152,
        title: '2. Tim Ingold: Ecologies of Perception',
        publisher: 'Peter Holliday',
        thumbnail: 'https://i.scdn.co/image/ab6765630000ba8a9f41b6a60769dfb6bd6b41e7',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The card prints the type where a description would go, which the id already states.
    it('should state no description when the card holds only the type', async () => {
      const typeOnlyCardAttrs = jsonAttrValue({
        title: 'Counterrevolution in Egypt (S. 15, Ep. 10)',
        subtitle: 'Marc Lynch',
        description: 'Episode',
      })
      const value = html`
        <iframe
          class="spotify-wrap podcast"
          data-attrs="${typeOnlyCardAttrs}"
          src="https://open.spotify.com/embed/episode/4BZArSMbp2VXkvtemKg8wX"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'episode/4BZArSMbp2VXkvtemKg8wX',
        src: 'https://open.spotify.com/embed/episode/4BZArSMbp2VXkvtemKg8wX',
        url: 'https://open.spotify.com/episode/4BZArSMbp2VXkvtemKg8wX',
        height: 152,
        title: 'Counterrevolution in Egypt (S. 15, Ep. 10)',
        publisher: 'Marc Lynch',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Substack's word for a show is `Podcast`, which is not the url's type word.
    it('should state no description when a show card holds only the type', async () => {
      const showLabelCardAttrs = jsonAttrValue({
        image: 'https://i.scdn.co/image/ab6765630000ba8afdd9d1a708b5dfd667da4f70',
        title: 'Hello Monday with Jessi Hempel',
        subtitle: 'LinkedIn',
        description: 'Podcast',
        url: 'https://open.spotify.com/show/1UpjOrXiDCANThT21viw4E',
      })
      const value = html`
        <iframe
          class="spotify-wrap podcast"
          data-attrs="${showLabelCardAttrs}"
          src="https://open.spotify.com/embed/show/1UpjOrXiDCANThT21viw4E"
          data-component-name="Spotify2ToDOM"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'show/1UpjOrXiDCANThT21viw4E',
        src: 'https://open.spotify.com/embed/show/1UpjOrXiDCANThT21viw4E',
        url: 'https://open.spotify.com/show/1UpjOrXiDCANThT21viw4E',
        height: 152,
        title: 'Hello Monday with Jessi Hempel',
        publisher: 'LinkedIn',
        thumbnail: 'https://i.scdn.co/image/ab6765630000ba8afdd9d1a708b5dfd667da4f70',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a description that says something the type does not', async () => {
      const describedCardAttrs = jsonAttrValue({
        title: 'A memoir',
        description: 'Nine years since it came out',
      })
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs="${describedCardAttrs}"
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

      expect(await extract(value)).toEqual(expected)
    })

    // Some payloads carry the title key with an empty string, which must not shadow the name
    // the iframe's own title states.
    it('should fall back to the stated title when the card title is blank', async () => {
      const blankTitleCardAttrs = jsonAttrValue({
        title: '',
        subtitle: 'The Smiths',
      })
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs="${blankTitleCardAttrs}"
          src="https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t"
          title="Spotify Embed: Cemetry Gates"
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
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should treat a whitespace-only card title as blank', async () => {
      const whitespaceTitleCardAttrs = jsonAttrValue({
        title: '   ',
      })
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs="${whitespaceTitleCardAttrs}"
          src="https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t"
          title="Spotify Embed: Cemetry Gates"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'spotify',
        id: 'track/03yOjwHoOPDlTUg0NRxN6t',
        src: 'https://open.spotify.com/embed/track/03yOjwHoOPDlTUg0NRxN6t',
        url: 'https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t',
        height: 152,
        title: 'Cemetry Gates',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // An artwork url is only trusted when it comes from Spotify's own image host.
    it('should ignore artwork hosted somewhere else', async () => {
      const foreignArtworkAttrs = jsonAttrValue({
        title: 'A track',
        image: 'https://evil.test/i.scdn.co/image/x',
      })
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs="${foreignArtworkAttrs}"
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

      expect(await extract(value)).toEqual(expected)
    })

    // A payload writing the artwork without a scheme still names Spotify's image host.
    it('should keep protocol-relative artwork on the image host', async () => {
      const attrs = jsonAttrValue({
        title: 'A track',
        image: '//i.scdn.co/image/ab67616d0000b273',
      })
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs="${attrs}"
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
        thumbnail: '//i.scdn.co/image/ab67616d0000b273',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A path names no host at all, so it cannot be shown to be Spotify's.
    it('should ignore artwork stated as a bare path', async () => {
      const attrs = jsonAttrValue({
        title: 'A track',
        image: '/image/ab67616d0000b273',
      })
      const value = html`
        <iframe
          class="spotify-wrap"
          data-attrs="${attrs}"
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

      expect(await extract(value)).toEqual(expected)
    })
  })

  it('should ignore a non-spotify iframe', async () => {
    const value = '<iframe src="https://example.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
