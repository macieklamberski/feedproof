import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { EmbedResolverResult } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { soundcloudEmbedResolver } from './soundcloud.js'

describeForEachParser('soundcloudEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(soundcloudEmbedResolver.selector)

    return element ? (soundcloudEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      convertWidgets({ ...baseContext, widgetResolvers: [soundcloudEmbedResolver] }),
    ])
  }

  describe('happy paths', () => {
    it('should read the author and canonical url from the share-snippet sibling', () => {
      const value = html`
        <iframe width="100%" height="300" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1597257306&color=%23ff5500"></iframe>
        <div style="font-size: 10px;">
          <a href="https://soundcloud.com/anjunadeep" title="Anjunadeep" target="_blank">Anjunadeep</a>
          ·
          <a href="https://soundcloud.com/anjunadeep/the-anjunadeep-edition-586" title="The Anjunadeep Edition 586" target="_blank">The Anjunadeep Edition 586</a>
        </div>
      `
      const result = extract(value)

      expect(result).toEqual({
        provider: 'soundcloud',
        id: 'tracks/1597257306',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1597257306&color=%23ff5500',
        author: 'Anjunadeep',
        title: 'The Anjunadeep Edition 586',
        url: 'https://soundcloud.com/anjunadeep/the-anjunadeep-edition-586',
      })
    })

    it('should remove the consumed sibling so its links do not render twice', async () => {
      const value = html`
        <iframe height="300" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"></iframe>
        <div>
          <a href="https://soundcloud.com/artist">Artist</a> ·
          <a href="https://soundcloud.com/artist/track">Track title</a>
        </div>
      `
      const result = await transform(value)

      expect(result).toContain('data-embed-provider="soundcloud"')
      expect(result).not.toContain('>Artist</a>')
    })

    it('should read the title from the iframe title attribute', () => {
      const value =
        '<iframe title="Track by Artist" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/292279199&visual=true"></iframe>'

      expect(extract(value)).toMatchObject({
        title: 'Track by Artist',
        id: 'tracks/292279199',
      })
    })
  })

  describe('edge cases', () => {
    it('should yield only the src and id for a bare iframe', () => {
      const value =
        '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/44018/"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'soundcloud',
        id: 'playlists/44018',
        src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/44018/',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should leave a sibling that is not the share snippet alone', async () => {
      const value = html`
        <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"></iframe>
        <p>A caption the author wrote with one <a href="https://soundcloud.com/artist">link</a>.</p>
      `
      const result = await transform(value)

      expect(result).toContain('A caption the author wrote')
    })

    it('should return undefined for a foreign host carrying the player path', () => {
      const value =
        '<iframe src="https://evil.test/w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1"></iframe>'

      expect(extract(value)).toBeUndefined()
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
