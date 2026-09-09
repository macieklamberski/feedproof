import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { aparatIframeEmbedResolver, aparatScriptEmbedResolver } from './aparat.js'

describeForEachParser('aparatIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, aparatIframeEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the player frame and keep the size the publisher stated', async () => {
      const value = html`
        <iframe
          src="https://www.aparat.com/video/video/embed/videohash/9o8zZ/vt/frame"
          width="640"
          height="360"
          allowfullscreen="true"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'aparat',
        id: '9o8zZ',
        src: 'https://www.aparat.com/video/video/embed/videohash/9o8zZ/vt/frame',
        url: 'https://www.aparat.com/v/9o8zZ',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state the platform ratio when the carrier states no size', async () => {
      const value =
        '<iframe src="https://www.aparat.com/video/video/embed/videohash/GrA49/vt/frame"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'aparat',
        id: 'GrA49',
        src: 'https://www.aparat.com/video/video/embed/videohash/GrA49/vt/frame',
        url: 'https://www.aparat.com/v/GrA49',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the title the player frame states', async () => {
      const value = html`
        <iframe
          src="https://www.aparat.com/video/video/embed/videohash/pew7J/vt/frame"
          title="تاریخچه جشنواره وب و موبایل ایران"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'aparat',
        id: 'pew7J',
        src: 'https://www.aparat.com/video/video/embed/videohash/pew7J/vt/frame',
        url: 'https://www.aparat.com/v/pew7J',
        ratio: '16/9',
        title: 'تاریخچه جشنواره وب و موبایل ایران',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a hash longer than the ones in circulation', async () => {
      const value =
        '<iframe src="https://www.aparat.com/video/video/embed/videohash/aB3dE5fG7hJ/vt/frame"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'aparat',
        id: 'aB3dE5fG7hJ',
        src: 'https://www.aparat.com/video/video/embed/videohash/aB3dE5fG7hJ/vt/frame',
        url: 'https://www.aparat.com/v/aB3dE5fG7hJ',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a seven-character hash', async () => {
      const value =
        '<iframe src="https://www.aparat.com/video/video/embed/videohash/1W2ndAb/vt/frame"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'aparat',
        id: '1W2ndAb',
        src: 'https://www.aparat.com/video/video/embed/videohash/1W2ndAb/vt/frame',
        url: 'https://www.aparat.com/v/1W2ndAb',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a video page rather than the player frame', async () => {
      const value = '<iframe src="https://www.aparat.com/v/9o8zZ"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a frame path carrying no hash', async () => {
      const value =
        '<iframe src="https://www.aparat.com/video/video/embed/videohash//vt/frame"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/www.aparat.com/video/video/embed/videohash/9o8zZ/vt/frame"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('aparatScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, aparatScriptEmbedResolver)

  // The facade the corpus is mostly made of: 326 of 338 feeds carry this and no companion
  // iframe, and the pipeline deletes the whole block today because the div is empty.
  describe('happy paths', () => {
    it('should resolve the loader script onto the same placeholder as the frame', async () => {
      const value = html`
        <script
          type="text/JavaScript"
          src="https://www.aparat.com/embed/inTtf?data[rnddiv]=44112505781&data[responsive]=yes"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'aparat',
        id: 'inTtf',
        src: 'https://www.aparat.com/video/video/embed/videohash/inTtf/vt/frame',
        url: 'https://www.aparat.com/v/inTtf',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a loader script carrying no query at all', async () => {
      const value = '<script src="https://www.aparat.com/embed/pew7J"></script>'
      const expected: EmbedResolverResult = {
        provider: 'aparat',
        id: 'pew7J',
        src: 'https://www.aparat.com/video/video/embed/videohash/pew7J/vt/frame',
        url: 'https://www.aparat.com/v/pew7J',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<script src="https://evil.test/www.aparat.com/embed/inTtf"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a loader script naming no hash', async () => {
      const value = '<script src="https://www.aparat.com/embed/"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The facade arrives wrapped in the empty div its script would have written into, which is the
// shape that made this a total loss rather than a degraded embed. Only the pipeline proves the
// block survives that div.
describeForEachParser('the aparat facade the pipeline used to delete', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  it('should keep the video that the empty wrapper used to take with it', async () => {
    const value = html`
      <p>Before</p>
      <div id="44112505781">
        <script
          type="text/JavaScript"
          src="https://www.aparat.com/embed/inTtf?data[rnddiv]=44112505781&data[responsive]=yes"
        ></script>
      </div>
      <p>After</p>
    `
    const result = await convert(value)

    expect(result).toContain('data-embed-provider="aparat"')
    expect(result).toContain('data-embed-id="inTtf"')
    expect(result).toContain('data-embed-ratio="16/9"')
  })
})
