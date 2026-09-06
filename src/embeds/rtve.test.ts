import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { rtveFlashEmbedResolver, rtveIframeEmbedResolver, rtveResolveEmbed } from './rtve.js'

describe('rtveResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from a video player url', () => {
      const value = 'https://www.rtve.es/drmn/embed/video/2474214'
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'video/2474214',
        src: 'https://www.rtve.es/drmn/embed/video/2474214/',
        url: 'https://www.rtve.es/v/2474214/',
        thumbnail: 'https://img.rtve.es/v/2474214/',
        ratio: '100/57.6',
      }

      expect(rtveResolveEmbed(value)).toEqual(expected)
    })

    it('should build the placeholder from an audio player url without a poster', () => {
      const value = 'https://secure-embed.rtve.es/drmn/embed/audio/1925451/'
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'audio/1925451',
        src: 'https://www.rtve.es/drmn/embed/audio/1925451/',
        url: 'https://www.rtve.es/a/1925451/',
      }

      expect(rtveResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a foreign host carrying the same path', () => {
      const value = 'https://rtve.es.evil.test/drmn/embed/video/2474214'

      expect(rtveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a kind the player does not serve', () => {
      const value = 'https://www.rtve.es/drmn/embed/photo/2474214'

      expect(rtveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an id outside the numeric shape', () => {
      const value = 'https://www.rtve.es/drmn/embed/video/evil'

      expect(rtveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a player url naming no asset', () => {
      const value = 'https://www.rtve.es/drmn/embed/video/'

      expect(rtveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an rtve url that is not the player', () => {
      const value = 'https://www.rtve.es/play/videos/la-aventura-del-saber/copyleft/2474214/'

      expect(rtveResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('rtveIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, rtveIframeEmbedResolver)

  describe('happy paths', () => {
    // The snippet names the asset in `name`, and the frame is sized by its wrapper rather than
    // by attributes of its own, so the ratio is what the placeholder carries.
    it('should read the title off the name the snippet writes', async () => {
      const value = html`
        <iframe
          frameborder="0"
          src="http://www.rtve.es/drmn/embed/video/2474214"
          name="La Aventura del Saber. Copyleft"
          scrolling="no"
          style="width:100%;height:90%;position:absolute;left:0;top:0;overflow:hidden;"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'video/2474214',
        src: 'https://www.rtve.es/drmn/embed/video/2474214/',
        url: 'https://www.rtve.es/v/2474214/',
        thumbnail: 'https://img.rtve.es/v/2474214/',
        ratio: '100/57.6',
        title: 'La Aventura del Saber. Copyleft',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the ratio over a declared size', async () => {
      const value = html`
        <iframe
          src="https://secure-embed.rtve.es/drmn/embed/video/5544716"
          width="300"
          height="150"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'video/5544716',
        src: 'https://www.rtve.es/drmn/embed/video/5544716/',
        url: 'https://www.rtve.es/v/5544716/',
        thumbnail: 'https://img.rtve.es/v/5544716/',
        ratio: '100/57.6',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the declared height of an audio frame', async () => {
      const value = html`
        <iframe
          src="http://www.rtve.es/drmn/embed/audio/2518208"
          width="425"
          height="37"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'audio/2518208',
        src: 'https://www.rtve.es/drmn/embed/audio/2518208/',
        url: 'https://www.rtve.es/a/2518208/',
        width: 425,
        height: 37,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/www.rtve.es/drmn/embed/video/2474214"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('rtveFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, rtveFlashEmbedResolver)

  // The v2 player names the asset in the swf query. Its declared box is the old player's, so
  // the ratio takes over.
  describe('the v2 player', () => {
    it('should repair the dead player to the modern video embed', async () => {
      const value = html`
        <object
          id="RTVEPlayer"
          data="http://www.rtve.es/swf/v2/RTVEPlayer.swf?assetID=309749_es_videos&amp;location=embed"
          width="425"
          height="300"
        >
          <param
            name="movie"
            value="http://www.rtve.es/swf/v2/RTVEPlayer.swf?assetID=309749_es_videos&amp;location=embed"
          />
          <param name="wmode" value="opaque" />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'video/309749',
        src: 'https://www.rtve.es/drmn/embed/video/309749/',
        url: 'https://www.rtve.es/v/309749/',
        thumbnail: 'https://img.rtve.es/v/309749/',
        ratio: '100/57.6',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the declared bar of an audio player', async () => {
      const value = html`
        <embed
          src="http://www.rtve.es/swf/v2/RTVEPlayer.swf?assetID=1025053_es_audios&amp;location=embed"
          width="650"
          height="45"
          type="application/x-shockwave-flash"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'audio/1025053',
        src: 'https://www.rtve.es/drmn/embed/audio/1025053/',
        url: 'https://www.rtve.es/a/1025053/',
        width: 650,
        height: 45,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The 4.x player leaves the swf url bare and passes the asset in the flashvars.
  describe('the 4.x player', () => {
    it('should read the asset off the flashvars param', async () => {
      const value = html`
        <object
          data="http://swf.rtve.es/swf/4.2.26/RTVEPlayerVideo.swf"
          type="application/x-shockwave-flash"
          width="425"
          height="239"
        >
          <param name="movie" value="http://swf.rtve.es/swf/4.2.26/RTVEPlayerVideo.swf" />
          <param name="flashvars" value="assetID=1081934_es_videos&amp;location=embed_videos" />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'video/1081934',
        src: 'https://www.rtve.es/drmn/embed/video/1081934/',
        url: 'https://www.rtve.es/v/1081934/',
        thumbnail: 'https://img.rtve.es/v/1081934/',
        ratio: '100/57.6',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the title off the fallback link the snippet writes', async () => {
      const value = html`
        <object
          data="http://www.rtve.es/swf/4.1.14/RTVEPlayerVideo.swf"
          type="application/x-shockwave-flash"
          width="425"
          height="239"
        >
          <param name="flashvars" value="assetID=1551723_es_videos&amp;location=embed_videos" />
          <a href="https://example.com/alacarta/videos/mitos-y-leyendas/aquiles/1551723/">
            Mitos y leyendas - Aquiles
          </a>
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'video/1551723',
        src: 'https://www.rtve.es/drmn/embed/video/1551723/',
        url: 'https://www.rtve.es/v/1551723/',
        thumbnail: 'https://img.rtve.es/v/1551723/',
        ratio: '100/57.6',
        title: 'Mitos y leyendas - Aquiles',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read an audio asset off the flashvars attribute', async () => {
      const value = html`
        <embed
          src="http://www.rtve.es/swf/4.0.31/RTVEPlayerAudio.swf"
          flashvars="assetID=1251286_es_audios&amp;location=embed_audios"
          width="425"
          height="37"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'rtve',
        id: 'audio/1251286',
        src: 'https://www.rtve.es/drmn/embed/audio/1251286/',
        url: 'https://www.rtve.es/a/1251286/',
        width: 425,
        height: 37,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when neither the swf query nor the flashvars name an asset', async () => {
      const value = html`
        <object data="http://swf.rtve.es/swf/4.2.26/RTVEPlayerVideo.swf">
          <param name="flashvars" value="location=embed_videos" />
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an asset outside the id grammar', async () => {
      const value = html`
        <embed src="http://www.rtve.es/swf/v2/RTVEPlayer.swf?assetID=../evil_es_videos" />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an rtve url that is not the flash player', async () => {
      const value = html`
        <object data="http://www.rtve.es/drmn/embed/video/2474214?assetID=309749_es_videos"></object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a foreign host carrying the player path', async () => {
      const value = html`
        <embed src="https://evil.test/www.rtve.es/swf/v2/RTVEPlayer.swf?assetID=309749_es_videos" />
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
