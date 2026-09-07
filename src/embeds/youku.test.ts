import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { youkuEmbedResolver } from './youku.js'

describeForEachParser('youkuEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, youkuEmbedResolver)

  describe('happy paths', () => {
    it('should keep the player ratio over the box the share snippet declares', async () => {
      const value = html`
        <iframe
          src="http://player.youku.com/embed/XNDUyNTczMDEyOA=="
          height="498"
          width="510"
          allowfullscreen=""
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'youku',
        id: 'XNDUyNTczMDEyOA==',
        src: 'https://player.youku.com/embed/XNDUyNTczMDEyOA==',
        url: 'https://v.youku.com/v_show/id_XNDUyNTczMDEyOA==.html',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should drop the client key a frame carries in its query', async () => {
      const value =
        '<iframe src="https://player.youku.com/embed/XNTg1ODI0MTE1Mg==?client_id=d0b1b77a17cded3b"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'youku',
        id: 'XNTg1ODI0MTE1Mg==',
        src: 'https://player.youku.com/embed/XNTg1ODI0MTE1Mg==',
        url: 'https://v.youku.com/v_show/id_XNTg1ODI0MTE1Mg==.html',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Youku has minted ids of several lengths, so only the `X` and the alphabet are checked.
    it('should read an id longer than the ones minted so far', async () => {
      const value =
        '<iframe src="https://player.youku.com/embed/XNDUyNTczMDEyOFdvcmtpbmdMb25nZXI="></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'youku',
        id: 'XNDUyNTczMDEyOFdvcmtpbmdMb25nZXI=',
        src: 'https://player.youku.com/embed/XNDUyNTczMDEyOFdvcmtpbmdMb25nZXI=',
        url: 'https://v.youku.com/v_show/id_XNDUyNTczMDEyOFdvcmtpbmdMb25nZXI=.html',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a video id that is not one', async () => {
      const value = '<iframe src="https://player.youku.com/embed/watch"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the player api script path', async () => {
      const value = '<iframe src="https://player.youku.com/iframeapi"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a static-host swf that is not a player', async () => {
      const value =
        '<embed src="http://static.youku.com/v1.0.0080/v/swf/loader.swf?VideoIDS=XMTE4Mzc2NTcy">'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/player.youku.com/embed/XODczMzU0NTAw"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the Flash players that carried the same id', () => {
    it('should repair the player.php swf onto the modern player and drop its Flash box', async () => {
      const value = html`
        <embed
          src="http://player.youku.com/player.php/sid/XODczMzU0NTAw/v.swf"
          allowFullScreen="true"
          quality="high"
          width="480"
          height="400"
          type="application/x-shockwave-flash"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'youku',
        id: 'XODczMzU0NTAw',
        src: 'https://player.youku.com/embed/XODczMzU0NTAw',
        url: 'https://v.youku.com/v_show/id_XODczMzU0NTAw.html',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should repair the static-host qplayer swf that names the id in its query', async () => {
      const value = html`
        <embed
          src="http://static.youku.com/v1.0.0080/v/swf/qplayer.swf?VideoIDS=XMTE4Mzc2NTcy&embedid=-&showAd=0"
          width="530"
          height="440"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'youku',
        id: 'XMTE4Mzc2NTcy',
        src: 'https://player.youku.com/embed/XMTE4Mzc2NTcy',
        url: 'https://v.youku.com/v_show/id_XMTE4Mzc2NTcy.html',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The enclosure probe offers every attachment a feed carries to this resolver, and the player
// hosts are the ones a Youku file would sit on, so the id alphabet is what keeps a file playable.
describeForEachParser('youku through the pipeline', (parseHtml) => {
  it('should leave a video enclosure on the player host playable', async () => {
    const enclosures = [
      { url: 'https://player.youku.com/embed/XODczMzU0NTAw.mp4', type: 'video/mp4' },
    ]

    const expected = html`
      <video
        data-enclosure=""
        controls
        src="https://player.youku.com/embed/XODczMzU0NTAw.mp4"
      ></video>
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
