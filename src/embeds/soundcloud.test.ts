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
      convertWidgets({ ...baseContext, widgetResolvers: [soundcloudEmbedResolver] }),
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
      const value =
        '<iframe title="Track by Artist" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true"></iframe>'
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
  // extraction reaches them once the selector stops naming the iframe player path.
  describe('legacy Flash carriers', () => {
    it('should read the track reference from an <embed> carrier', async () => {
      const value =
        '<embed src="https://player.soundcloud.com/player.swf?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066">'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/34695066',
        src: 'https://player.soundcloud.com/player.swf?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the track reference from an <object> carrier', async () => {
      const value =
        '<object data="https://player.soundcloud.com/player.swf?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066"></object>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/34695066',
        src: 'https://player.soundcloud.com/player.swf?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34695066',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a carrier pointing somewhere else', async () => {
      const value = '<embed src="https://example.com/player.swf?url=whatever">'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the URN reference some feeds write instead of a bare id', () => {
    // The colons arrive percent-encoded twice over, since the reference is itself a query value.
    it('should read the id out of a percent-encoded URN', async () => {
      const value =
        '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2262754046"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/2262754046',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2262754046',
        height: 166,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the id out of a plain URN', async () => {
      const value =
        '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/soundcloud%3Aplaylists%3A1953831"></iframe>'
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
      const trackCardAttrs = {
        url: 'https://api.soundcloud.com/tracks/2088634614',
        title: "It's Just Us by Kali Uchis",
        description: 'A single',
        thumbnail_url: 'https://i1.sndcdn.com/artworks-t500x500.jpg',
        author_name: 'Kali Uchis',
        author_url: 'https://soundcloud.com/kaliuchis',
        targetUrl: 'https://soundcloud.com/kaliuchis/its-just-us',
      }
      const value = html`
        <div class="soundcloud-wrap" data-attrs="${jsonAttrValue(trackCardAttrs)}" data-component-name="SoundcloudToDOM">
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

    // Both fields are empty in a good share of the payloads, and an empty string is not a value.
    it('should state nothing for an empty description and target url', async () => {
      const untitledCardAttrs = {
        url: 'https://api.soundcloud.com/tracks/948032941',
        title: 'Youth Is A Fugitive',
        description: '',
        thumbnail_url: 'https://i1.sndcdn.com/artworks-j4ziiQ-t500x500.jpg',
        author_name: 'Fonograf Editions',
        targetUrl: '',
      }
      const value = html`
        <div class="soundcloud-wrap" data-attrs="${jsonAttrValue(untitledCardAttrs)}" data-component-name="SoundcloudToDOM">
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

  describe('edge cases', () => {
    it('should yield only the src, id and height for a bare iframe', async () => {
      const value =
        '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/44018/"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'playlists/44018',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/44018/',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should give the visual player its own height whatever it holds', async () => {
      const value =
        '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'tracks/292279199',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the height out when the player names nothing it can size', async () => {
      const value =
        '<iframe src="https://w.soundcloud.com/player/?url=https%3A//example.com/x"></iframe>'
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
      const result = await transform(value)

      expect(result).toContain('A caption the author wrote')
    })

    it('should return undefined for a foreign host carrying the player path', async () => {
      const value =
        '<iframe src="https://evil.test/w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"></iframe>'

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

    expect(twice).toBe(once)
  })
})
