import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { tencentEmbedResolver } from './tencent.js'

describeForEachParser('tencentEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, tencentEmbedResolver)

  describe('happy paths', () => {
    it('should build the placeholder from the current player', async () => {
      const value = html`
        <iframe
          src="https://v.qq.com/txp/iframe/player.html?vid=v03604lrvan"
          scrolling="no"
          frameborder="no"
          allowfullscreen="true"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'tencent',
        id: 'v03604lrvan',
        src: 'https://v.qq.com/txp/iframe/player.html?vid=v03604lrvan',
        url: 'https://v.qq.com/x/page/v03604lrvan.html',
        thumbnail: 'https://puui.qpic.cn/qqvideo_ori/0/v03604lrvan_496_280/0',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the ratio over the box the old player snippet declared', async () => {
      const value = html`
        <iframe
          frameborder="0"
          width="640"
          height="498"
          src="https://v.qq.com/iframe/player.html?vid=g0521429q6x&tiny=0&auto=0"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'tencent',
        id: 'g0521429q6x',
        src: 'https://v.qq.com/txp/iframe/player.html?vid=g0521429q6x',
        url: 'https://v.qq.com/x/page/g0521429q6x.html',
        thumbnail: 'https://puui.qpic.cn/qqvideo_ori/0/g0521429q6x_496_280/0',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the mobile preview player', async () => {
      const value = html`
        <iframe
          class="video_iframe"
          height="375"
          width="500"
          src="https://v.qq.com/iframe/preview.html?vid=i0018e1uc2x&width=500&height=375&auto=0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'tencent',
        id: 'i0018e1uc2x',
        src: 'https://v.qq.com/txp/iframe/player.html?vid=i0018e1uc2x',
        url: 'https://v.qq.com/x/page/i0018e1uc2x.html',
        thumbnail: 'https://puui.qpic.cn/qqvideo_ori/0/i0018e1uc2x_496_280/0',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Eleven characters is what Tencent mints today, and the length is not what selects a video.
    it('should resolve a video id longer than the ones minted so far', async () => {
      const value =
        '<iframe src="https://v.qq.com/txp/iframe/player.html?vid=v03604lrvanlonger"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'tencent',
        id: 'v03604lrvanlonger',
        src: 'https://v.qq.com/txp/iframe/player.html?vid=v03604lrvanlonger',
        url: 'https://v.qq.com/x/page/v03604lrvanlonger.html',
        thumbnail: 'https://puui.qpic.cn/qqvideo_ori/0/v03604lrvanlonger_496_280/0',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/v.qq.com/txp/iframe/player.html?vid=v03604lrvan"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the watch page, which frames nothing', async () => {
      const value = '<iframe src="https://v.qq.com/x/page/v03604lrvan.html"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a player that names no video', async () => {
      const value = '<iframe src="https://v.qq.com/txp/iframe/player.html?autoplay=true"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an id carrying a file name', async () => {
      const value =
        '<iframe src="https://v.qq.com/txp/iframe/player.html?vid=v03604lrvan.mp4"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a swf on the static host that is not the player', async () => {
      const value = '<embed src="http://static.video.qq.com/loader.swf?vid=u0015tdk4pp">'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the Flash players that carried the same id', () => {
    it('should repair the swf on the static host', async () => {
      const value = html`
        <embed
          src="http://static.video.qq.com/TPout.swf?vid=u0015tdk4pp&auto=0"
          allowFullScreen="true"
          quality="high"
          width="480"
          height="400"
          type="application/x-shockwave-flash"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'tencent',
        id: 'u0015tdk4pp',
        src: 'https://v.qq.com/txp/iframe/player.html?vid=u0015tdk4pp',
        url: 'https://v.qq.com/x/page/u0015tdk4pp.html',
        thumbnail: 'https://puui.qpic.cn/qqvideo_ori/0/u0015tdk4pp_496_280/0',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should repair the swf on the image cache host', async () => {
      const value = html`
        <embed
          src="https://imgcache.qq.com/tencentvideo_v1/playerv3/TPout.swf?max_age=86400&v=20161117&vid=z0381az2cdi&auto=0"
          width="480"
          height="400"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'tencent',
        id: 'z0381az2cdi',
        src: 'https://v.qq.com/txp/iframe/player.html?vid=z0381az2cdi',
        url: 'https://v.qq.com/x/page/z0381az2cdi.html',
        thumbnail: 'https://puui.qpic.cn/qqvideo_ori/0/z0381az2cdi_496_280/0',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The enclosure probe offers every attachment a feed carries to this resolver, and Tencent serves
// video on the same domains as the player, so the id alphabet is what keeps a file playable.
describeForEachParser('tencent through the pipeline', (parseHtml) => {
  it('should leave a video enclosure on the player host playable', async () => {
    const enclosures = [
      { url: 'https://v.qq.com/txp/iframe/player.html/v03604lrvan.mp4', type: 'video/mp4' },
    ]

    const expected = html`
      <video data-enclosure="" controls src="https://v.qq.com/txp/iframe/player.html/v03604lrvan.mp4"></video>
      <p>Body</p>
    `

    expect(
      await transformContent('<p>Body</p>', {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
        enclosures,
      }),
    ).toEqualHtml(expected)
  })
})
