import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { padletEmbedResolver } from './padlet.js'

describeForEachParser('padletEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, padletEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the board embed and derive its preview', async () => {
      const value = html`
        <iframe
          src="https://padlet.com/embed/228qqr1n7d19"
          frameborder="0"
          allow="camera;microphone;geolocation"
          style="width:100%;height:608px;display:block;padding:0;margin:0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'padlet',
        id: '228qqr1n7d19',
        src: 'https://padlet.com/embed/228qqr1n7d19',
        thumbnail: 'https://padlet.net/social-previews/board/228qqr1n7d19/opengraph.jpg',
        height: 608,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the height an older share code stated', async () => {
      const value = html`
        <iframe
          frameborder="0"
          height="480px"
          src="https://padlet.com/embed/1xv3ivvmg3zf"
          width="100%"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'padlet',
        id: '1xv3ivvmg3zf',
        src: 'https://padlet.com/embed/1xv3ivvmg3zf',
        thumbnail: 'https://padlet.net/social-previews/board/1xv3ivvmg3zf/opengraph.jpg',
        height: 480,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the preview form onto the board embed', async () => {
      const value = html`
        <iframe
          src="https://padlet.com/padlets/5r949isxqdhfcca7/embeds/preview_embed"
          style="width:100%;height:100%;display:block;padding:0;margin:0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'padlet',
        id: '5r949isxqdhfcca7',
        src: 'https://padlet.com/embed/5r949isxqdhfcca7',
        thumbnail: 'https://padlet.net/social-previews/board/5r949isxqdhfcca7/opengraph.jpg',
        height: 608,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should leave the slideshow view of a board alone', async () => {
      const value =
        '<iframe src="https://padlet.com/embed/a61rwkel0vfblmsz/slideshow?autoplay=0&loop=0"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the board page rather than its embed', async () => {
      const value =
        '<iframe src="https://padlet.com/gwusa/for-our-parks-for-our-future-9gm8z3x03iuwt1zp"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a board id that could not be one', async () => {
      const value = '<iframe src="https://padlet.com/embed/New%20Board"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/padlet.com/embed/228qqr1n7d19"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
