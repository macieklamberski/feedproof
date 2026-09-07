import { describe, expect, it } from 'bun:test'
import {
  baseContext,
  describeForEachParser,
  html,
  jsonAttrValue,
  resolverExtractor,
} from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { EmbedResolverResult } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { soundcloudEmbedResolver } from './soundcloud.js'

describeForEachParser('soundcloudEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, soundcloudEmbedResolver)

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      convertWidgets({
        ...baseContext,
        widgetResolvers: [soundcloudEmbedResolver],
      }),
    ])
  }

  describe('happy paths', () => {
    it('should read the author and canonical url from the share-snippet sibling', async () => {
      const value = html`
        <iframe width="100%" height="300" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1597257306&color=%23ff5500"></iframe>
        <div style="font-size: 10px;">
          <a href="https://soundcloud.com/anjunadeep" title="Anjunadeep" target="_blank">Anjunadeep</a>
          ·
          <a href="https://soundcloud.com/anjunadeep/the-anjunadeep-edition-586" title="The Anjunadeep Edition 586" target="_blank">The Anjunadeep Edition 586</a>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/1597257306',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1597257306&color=%23ff5500',
        url: 'https://soundcloud.com/anjunadeep/the-anjunadeep-edition-586',
        // The iframe states 300, which outranks the 166 the track player defaults to.
        height: 300,
        title: 'The Anjunadeep Edition 586',
        author: 'Anjunadeep',
      }
      const result = await extract(value)

      expect(result).toEqual(expected)
    })

    it('should remove the consumed sibling so its links do not render twice', async () => {
      const value = html`
        <iframe height="300" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"></iframe>
        <div>
          <a href="https://soundcloud.com/artist">Artist</a> ·
          <a href="https://soundcloud.com/artist/track">Track title</a>
        </div>
      `
      const expected = html`
        <div
          data-embed-src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"
          data-embed-provider="soundcloud"
          data-embed-id="tracks/1"
          data-embed-url="https://soundcloud.com/artist/track"
          data-embed-height="300"
          data-embed-title="Track title"
          data-embed-author="Artist"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read the title from the iframe title attribute', async () => {
      const value = html`
        <iframe
          title="Track by Artist"
          src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/292279199',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true',
        height: 450,
        title: 'Track by Artist',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The Flash player put the same `url=` reference on the legacy carriers, so the same
  // extraction reaches them once the selector stops naming the iframe player path. Its host is
  // gone, so the reference moves onto the widget rather than staying on a src that cannot load.
  describe('legacy Flash carriers', () => {
    it('should move the track reference onto the widget from an <embed> carrier', async () => {
      const value = html`
        <embed
          src="https://player.soundcloud.com/player.swf?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/34695066',
        src: 'https://w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should move the track reference onto the widget from an <object> carrier', async () => {
      const value = html`
        <object
          data="https://player.soundcloud.com/player.swf?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066"
        ></object>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/34695066',
        src: 'https://w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should move a page url the swf names onto the widget and keep the page as the url', async () => {
      const value = html`
        <embed
          src="http://player.soundcloud.com/player.swf?url=http%3A%2F%2Fsoundcloud.com%2Ferwtenpeller%2Fwar-of-the-worlds"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=http%3A%2F%2Fsoundcloud.com%2Ferwtenpeller%2Fwar-of-the-worlds',
        url: 'https://soundcloud.com/erwtenpeller/war-of-the-worlds',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry a private track across with the secret token the reference holds', async () => {
      const value = html`
        <embed
          src="https://player.soundcloud.com/player.swf?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F42888746%3Fsecret_token%3Ds-zV49D&secret_url=true"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/42888746',
        src: 'https://w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F42888746%3Fsecret_token%3Ds-zV49D',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The swf's own path is two words on a host that is not the site, so without a `url=` there
    // is nothing to move and nothing to name. Reading `player.swf` as a permalink minted
    // `soundcloud.com/player.swf` as somebody's page.
    it('should ignore a swf carrying no reference at all', async () => {
      const value = '<embed src="https://player.soundcloud.com/player.swf">'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a carrier pointing somewhere else', async () => {
      const value = '<embed src="https://example.com/player.swf?url=whatever">'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the URN reference some feeds write instead of a bare id', () => {
    // The colons arrive percent-encoded twice over, since the reference is itself a query value.
    it('should read the id out of a percent-encoded URN', async () => {
      const value = html`
        <iframe
          src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2262754046"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/2262754046',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2262754046',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the id out of a plain URN', async () => {
      const value = html`
        <iframe
          src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/soundcloud%3Aplaylists%3A1953831"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'playlists/1953831',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/soundcloud%3Aplaylists%3A1953831',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the Substack card the wrapper carries', () => {
    it('should take the title, description, artwork, artist and track page', async () => {
      const trackCardAttrs = jsonAttrValue({
        url: 'https://api.soundcloud.com/tracks/2088634614',
        title: "It's Just Us by Kali Uchis",
        description: 'A single',
        thumbnail_url: 'https://i1.sndcdn.com/artworks-t500x500.jpg',
        author_name: 'Kali Uchis',
        author_url: 'https://soundcloud.com/kaliuchis',
        targetUrl: 'https://soundcloud.com/kaliuchis/its-just-us',
      })
      const value = html`
        <div class="soundcloud-wrap" data-attrs="${trackCardAttrs}" data-component-name="SoundcloudToDOM">
          <iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F2088634614"></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/2088634614',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F2088634614',
        url: 'https://soundcloud.com/kaliuchis/its-just-us',
        height: 166,
        title: "It's Just Us by Kali Uchis",
        description: 'A single',
        thumbnail: 'https://i1.sndcdn.com/artworks-t500x500.jpg',
        author: 'Kali Uchis',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the iframe title when the payload carries none', async () => {
      const thumbnailOnlyCardAttrs = jsonAttrValue({
        thumbnail_url: 'https://i1.sndcdn.com/artworks-Xy2ab-t500x500.jpg',
      })
      const value = html`
        <div
          class="soundcloud-wrap"
          data-attrs="${thumbnailOnlyCardAttrs}"
          data-component-name="SoundcloudToDOM"
        >
          <iframe
            title="Real Track Name"
            src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F12345"
          ></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/12345',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F12345',
        height: 166,
        title: 'Real Track Name',
        thumbnail: 'https://i1.sndcdn.com/artworks-Xy2ab-t500x500.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should let the payload title override the one the iframe states', async () => {
      const titledCardAttrs = jsonAttrValue({
        title: 'Golden Hour (Extended Mix)',
      })
      const value = html`
        <div
          class="soundcloud-wrap"
          data-attrs="${titledCardAttrs}"
          data-component-name="SoundcloudToDOM"
        >
          <iframe
            title="Golden Hour by Nightdrift"
            src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F67890"
          ></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/67890',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F67890',
        height: 166,
        title: 'Golden Hour (Extended Mix)',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Both fields are empty in a good share of the payloads, and an empty string is not a value.
    it('should state nothing for an empty description and target url', async () => {
      const untitledCardAttrs = jsonAttrValue({
        url: 'https://api.soundcloud.com/tracks/948032941',
        title: 'Youth Is A Fugitive',
        description: '',
        thumbnail_url: 'https://i1.sndcdn.com/artworks-j4ziiQ-t500x500.jpg',
        author_name: 'Fonograf Editions',
        targetUrl: '',
      })
      const value = html`
        <div class="soundcloud-wrap" data-attrs="${untitledCardAttrs}" data-component-name="SoundcloudToDOM">
          <iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F948032941"></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/948032941',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F948032941',
        height: 166,
        title: 'Youth Is A Fugitive',
        thumbnail: 'https://i1.sndcdn.com/artworks-j4ziiQ-t500x500.jpg',
        author: 'Fonograf Editions',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // SoundCloud hosts podcast audio at `feeds.soundcloud.com`, and a feed states that file as an
  // enclosure. It is the audio itself, so framing it shows nothing, but the file is named after
  // the track and the player is recoverable from it.
  describe('the podcast host, which serves the episode audio directly', () => {
    it('should build the player from the track the file is named after', async () => {
      const value = html`
        <iframe
          src="https://feeds.soundcloud.com/stream/2386923495-linear-digressions-ai.mp3"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/2386923495',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F2386923495',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Without a track id there is no player to build, and the file plays on its own, so the
    // resolver leaves it to be a native audio element.
    it('should not claim an audio file that names no track', async () => {
      const value =
        '<iframe src="https://feeds.soundcloud.com/stream/nameless-episode.mp3"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should not claim an audio file anywhere else on the host', async () => {
      const value = '<iframe src="https://soundcloud.com/downloads/session.mp3"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  // soundcloud.com answers `x-frame-options: SAMEORIGIN`, so a carrier naming a page renders
  // nothing. The widget takes a page url in place of a reference, which is what repairs it.
  describe('a carrier naming a page rather than the player', () => {
    it('should build the widget around a track page', async () => {
      const value = '<iframe src="https://soundcloud.com/anjunadeep/edition-586"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fanjunadeep%2Fedition-586',
        url: 'https://soundcloud.com/anjunadeep/edition-586',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should size a set as a playlist', async () => {
      const value = '<iframe src="https://soundcloud.com/anjunadeep/sets/edition"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fanjunadeep%2Fsets%2Fedition',
        url: 'https://soundcloud.com/anjunadeep/sets/edition',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should size a profile as a user', async () => {
      const value = '<iframe src="https://soundcloud.com/anjunadeep"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fanjunadeep',
        url: 'https://soundcloud.com/anjunadeep',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The widget refuses the token as a path segment and takes it as a parameter of its own.
    it('should move a private share token into the widget parameter', async () => {
      const value = '<iframe src="https://soundcloud.com/anjunadeep/demo/s-Xy12Ab"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fanjunadeep%2Fdemo&secret_token=s-Xy12Ab',
        url: 'https://soundcloud.com/anjunadeep/demo',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Already a working player, so only the url and the height are recovered from the page.
    it('should keep a widget src that already names a page', async () => {
      const value = html`
        <iframe
          src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fanjunadeep%2Fedition-586"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fanjunadeep%2Fedition-586',
        url: 'https://soundcloud.com/anjunadeep/edition-586',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // These first segments are SoundCloud's own sections, so none of them is a permalink and
    // none names a single item to size or to link to.
    it.each([
      'https://soundcloud.com/tags/jazz',
      'https://soundcloud.com/discover',
      'https://soundcloud.com/search?q=jazz',
      'https://soundcloud.com/stream',
      'https://soundcloud.com/upload',
      'https://soundcloud.com/pages/terms',
      'https://soundcloud.com/imprint',
      'https://soundcloud.com/you/collection',
    ])('should not read a site section as user content (%s)', async (url) => {
      const value = `<iframe src="${url}"></iframe>`
      const expected: EmbedResolverResult = { provider: 'soundcloud', src: url }

      expect(await extract(value)).toEqual(expected)
    })

    // The shortener answers a redirect, so the code is not a permalink: reading it as one names
    // `soundcloud.com/{code}`, which does not exist. The widget resolves the short url itself.
    it('should hand a share short link to the widget rather than rebuild it as a page', async () => {
      const value = '<iframe src="https://on.soundcloud.com/AbCdEf"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fon.soundcloud.com%2FAbCdEf',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a reference on the api-v2 host', async () => {
      const value = html`
        <iframe src="https://w.soundcloud.com/player/?url=https%3A//api-v2.soundcloud.com/tracks/293"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api-v2.soundcloud.com/tracks/293',
        id: 'tracks/293',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should yield only the src, id and height for a bare iframe', async () => {
      const value = html`
        <iframe
          src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/44018/"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'playlists/44018',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/44018/',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should give the visual player its own height whatever it holds', async () => {
      const value = html`
        <iframe
          src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/292279199',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the height out when the player names nothing it can size', async () => {
      const value = html`
        <iframe src="https://w.soundcloud.com/player/?url=https%3A//example.com/x"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        src: 'https://w.soundcloud.com/player/?url=https%3A//example.com/x',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave a sibling that is not the share snippet alone', async () => {
      const value = html`
        <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"></iframe>
        <p>A caption the author wrote with one <a href="https://soundcloud.com/artist">link</a>.</p>
      `
      const expected = html`
        <div
          data-embed-src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"
          data-embed-provider="soundcloud"
          data-embed-id="tracks/1"
          data-embed-height="166"
        ></div>
        <p>A caption the author wrote with one <a href="https://soundcloud.com/artist">link</a>.</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should return undefined for a foreign host carrying the player path', async () => {
      const value = html`
        <iframe
          src="https://evil.test/w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <iframe height="300" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"></iframe>
      <div>
        <a href="https://soundcloud.com/artist">Artist</a> ·
        <a href="https://soundcloud.com/artist/track">Track title</a>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
