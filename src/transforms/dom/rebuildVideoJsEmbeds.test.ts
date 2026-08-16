import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildVideoJsEmbeds } from './rebuildVideoJsEmbeds.js'

describeForEachParser('rebuildVideoJsEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildVideoJsEmbeds(baseContext)])
  }

  describe('happy paths', () => {
    it('should rebuild a native video from a source child', async () => {
      const value = html`
        <video-js class="vjs-fluid" poster="https://example.com/poster.jpg">
          <source src="https://example.com/clip.mp4" type="video/mp4">
        </video-js>
      `
      const expected = html`
        <video
          poster="https://example.com/poster.jpg"
          controls
          src="https://example.com/clip.mp4"
        ></video>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should rebuild from the data-setup sources when there is no source child', async () => {
      const config = JSON.stringify({
        sources: [{ src: 'https://example.com/clip.mp4', type: 'video/mp4' }],
        poster: 'https://example.com/poster.jpg',
      })
      const value = `<video-js data-setup='${config}'></video-js>`
      const expected = html`
        <video
          poster="https://example.com/poster.jpg"
          controls
          src="https://example.com/clip.mp4"
        ></video>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should skip past a source it cannot play to one it can', async () => {
      const value = html`
        <video-js>
          <source src="https://example.com/live.m3u8" type="application/x-mpegURL">
          <source src="https://example.com/clip.mp4" type="video/mp4">
        </video-js>
      `
      const expected = '<video controls src="https://example.com/clip.mp4"></video>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('left alone', () => {
    // A stream manifest needs the JS player to fetch and stitch its segments; a native <video>
    // pointed at one shows an empty box everywhere except Safari.
    it('should leave an element whose only source is a stream manifest', async () => {
      const value = html`
        <video-js>
          <source src="https://example.com/live.m3u8" type="application/x-mpegURL">
        </video-js>
      `

      expect(await transform(value)).toBe(value)
    })

    // A hosted player's element names an id and no file, so it survives this pass untouched and
    // reaches the widget resolvers, where the platform that understands the id claims it. The
    // assertion is on the whole markup: an attribute quietly dropped here would strand the
    // element with nothing able to read it.
    it('should leave an element that names a hosted player rather than a file', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-video-id="6098765432"
        ></video-js>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave an element naming no file at all', async () => {
      const value = html`
        <video-js
          class="vjs-big-play-centered"
          preload="auto"
        ></video-js>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave an element whose data-setup is malformed json', async () => {
      const value = `<video-js data-setup='{"sources":['></video-js>`
      const expected = '<video-js data-setup="{&quot;sources&quot;:["></video-js>'

      expect(await transform(value)).toBe(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <video-js><source src="https://example.com/clip.mp4" type="video/mp4"></video-js>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
