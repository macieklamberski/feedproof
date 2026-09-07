import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { videopressFlashEmbedResolver, videopressIframeEmbedResolver } from './videopress.js'

describeForEachParser('videopressIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, videopressIframeEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the block editor embed and drop the player styling query', async () => {
      const value = html`
        <iframe
          title="VideoPress Video Player"
          aria-label="VideoPress Video Player"
          width="800"
          height="450"
          src="https://video.wordpress.com/embed/FLEAXUMB?cover=1&preloadContent=metadata&useAverageColor=1&hd=0"
          frameborder="0"
          allowfullscreen
          data-resize-to-parent="true"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'FLEAXUMB',
        src: 'https://videopress.com/embed/FLEAXUMB?hd=0',
        url: 'https://videopress.com/v/FLEAXUMB',
        width: 800,
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the shortcode iframe on the videopress host', async () => {
      const value = html`
        <iframe
          width="640"
          height="360"
          src="https://videopress.com/embed/bDC13L49?hd=1&autoPlay=0"
          frameborder="0"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'bDC13L49',
        src: 'https://videopress.com/embed/bDC13L49?hd=1',
        url: 'https://videopress.com/v/bDC13L49',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the start offset and the loop flag', async () => {
      const value = html`
        <iframe src="https://videopress.com/embed/FLEAXUMB?at=42&loop=1&muted=1"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'FLEAXUMB',
        src: 'https://videopress.com/embed/FLEAXUMB?at=42&loop=1',
        url: 'https://videopress.com/v/FLEAXUMB',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a guid longer than the eight characters minted so far', async () => {
      const value = '<iframe src="https://videopress.com/embed/bDC13L49x"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'bDC13L49x',
        src: 'https://videopress.com/embed/bDC13L49x',
        url: 'https://videopress.com/v/bDC13L49x',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the page url a page builder frames as the player', async () => {
      const value = '<iframe src="https://videopress.com/v/FLEAXUMB"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'FLEAXUMB',
        src: 'https://videopress.com/embed/FLEAXUMB',
        url: 'https://videopress.com/v/FLEAXUMB',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a guid holding a separator', async () => {
      const value = '<iframe src="https://videopress.com/embed/FLEAXUMB-extra"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a videopress path that is not the player or the page', async () => {
      const value = '<iframe src="https://videopress.com/pricing/FLEAXUMB"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a wordpress.com blog framing its own post', async () => {
      const value = html`
        <iframe src="https://example.wordpress.com/2024/01/01/embed/FLEAXUMB/embed/"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/videopress.com/embed/FLEAXUMB"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the title the carrier states', () => {
    it('should not take the player label Jetpack writes as the video title', async () => {
      const value = html`
        <iframe
          title="VideoPress Video Player"
          src="https://video.wordpress.com/embed/FLEAXUMB"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'FLEAXUMB',
        src: 'https://videopress.com/embed/FLEAXUMB',
        url: 'https://videopress.com/v/FLEAXUMB',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

describeForEachParser('videopressFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, videopressFlashEmbedResolver)

  describe('happy paths', () => {
    it('should read the guid out of the flashvars on the embed', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://s0.videopress.com/player.swf?v=1"
          width="450"
          height="274"
          wmode="transparent"
          seamlesstabbing="true"
          allowfullscreen="true"
          allowscriptaccess="always"
          overstretch="true"
          flashvars="guid=TxdSIdpO&isDynamicSeeking=false"
        ></embed>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'TxdSIdpO',
        src: 'https://videopress.com/embed/TxdSIdpO',
        url: 'https://videopress.com/v/TxdSIdpO',
        width: 450,
        height: 274,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the guid the snippet inlined on the player query', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://v0.wordpress.com/player.swf?v=1.03&guid=TxdSIdpO&isDynamicSeeking=true"
          width="400"
          height="224"
        ></embed>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'TxdSIdpO',
        src: 'https://videopress.com/embed/TxdSIdpO',
        url: 'https://videopress.com/v/TxdSIdpO',
        width: 400,
        height: 224,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the flashvars param when the object carries the player', async () => {
      const value = html`
        <object
          type="application/x-shockwave-flash"
          data="http://s0.videopress.com/player.swf?v=1"
          width="450"
          height="274"
        >
          <param name="movie" value="http://s0.videopress.com/player.swf?v=1" />
          <param name="flashvars" value="guid=TxdSIdpO&isDynamicSeeking=false" />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'TxdSIdpO',
        src: 'https://videopress.com/embed/TxdSIdpO',
        url: 'https://videopress.com/v/TxdSIdpO',
        width: 450,
        height: 274,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore the player when nothing names a guid', async () => {
      const value = '<embed src="http://s0.videopress.com/player.swf?v=1"></embed>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a guid of the wrong shape', async () => {
      const value = html`
        <embed
          src="http://s0.videopress.com/player.swf?v=1"
          flashvars="guid=../etc&isDynamicSeeking=false"
        ></embed>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The carrier states a guid in two places and they disagree, so each is validated rather
    // than the flashvars one winning merely by being present.
    it('should read the src guid when the flashvars guid is malformed', async () => {
      const value = html`
        <embed
          src="http://s0.videopress.com/player.swf?guid=kUJmAcSf&v=1"
          flashvars="guid=../etc&isDynamicSeeking=false"
        ></embed>
      `
      const expected: EmbedResolverResult = {
        provider: 'videopress',
        id: 'kUJmAcSf',
        src: 'https://videopress.com/embed/kUJmAcSf',
        url: 'https://videopress.com/v/kUJmAcSf',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a swf that is not the player', async () => {
      const value = html`
        <embed
          src="http://s0.videopress.com/other.swf"
          flashvars="guid=TxdSIdpO"
        ></embed>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
