import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  brightcoveFlashEmbedResolver,
  brightcoveResolveEmbed,
  brightcoveVideoJsEmbedResolver,
} from './brightcove.js'

describeForEachParser('brightcoveFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, brightcoveFlashEmbedResolver)

  describe('happy paths', () => {
    it('should read the account from the url and the video id from flashVars', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9/19517958001?isVid=1&publisherID=1660622131"
          flashVars="@videoPlayer=19521637001&playerID=19517958001&domain=embed&"
          width="300"
          height="250"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '19521637001',
        src: 'https://players.brightcove.net/1660622131/default_default/index.html?videoId=19521637001',
        width: 300,
        height: 250,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a federated url with no video id anywhere', async () => {
      const value =
        '<embed src="http://c.brightcove.com/services/viewer/federated_f9/19517958001?publisherID=1660622131">'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a video id given as an account reference', async () => {
      const value =
        '<embed src="http://c.brightcove.com/services/viewer/federated_f9/1?publisherID=1660622131" flashVars="@videoPlayer=ref:my-video">'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a brightcove url that is not a federated player', async () => {
      const value = '<embed src="http://admin.brightcove.com/viewer/us1/something.swf">'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('brightcoveResolveEmbed', () => {
  const playerUrl =
    'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432'

  describe('happy paths', () => {
    it('should read the account and video id out of the player url', () => {
      const value = playerUrl
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6098765432',
        src: playerUrl,
      }

      expect(brightcoveResolveEmbed(value)).toEqual(expected)
    })

    it('should keep a named player rather than assuming the default', () => {
      const value =
        'https://players.brightcove.net/1234567890/AbCdEf123_custom/index.html?videoId=6098765432'
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6098765432',
        src: 'https://players.brightcove.net/1234567890/AbCdEf123_custom/index.html?videoId=6098765432',
      }

      expect(brightcoveResolveEmbed(value)).toEqual(expected)
    })

    it('should drop the other player parameters', () => {
      const value = `${playerUrl}&autoplay=true&muted=true`
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6098765432',
        src: playerUrl,
      }

      expect(brightcoveResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // A reference id names the video for the account's own API, not the player.
    it('should return undefined for a reference id', () => {
      const value =
        'https://players.brightcove.net/1234567890/default_default/index.html?videoId=ref:my-video'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined when the url names no video', () => {
      const value = 'https://players.brightcove.net/1234567890/default_default/index.html'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    // `{player}_{embed}` is one segment holding two ids.
    it('should return undefined when the player segment is not a player path', () => {
      const value = 'https://players.brightcove.net/1234567890/index.html?videoId=6098765432'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for another brightcove.net host', () => {
      const value = 'https://studio.brightcove.net/1234567890/default_default/index.html?videoId=1'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a url that cannot be parsed', () => {
      const value = 'https://['

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('brightcoveVideoJsEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, brightcoveVideoJsEmbedResolver)

  describe('happy paths', () => {
    it('should mint the player page from the element attributes', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-player="AbCdEf"
          data-embed="custom"
          data-video-id="6098765432"
          controls
        ></video-js>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6098765432',
        src: 'https://players.brightcove.net/1234567890/AbCdEf_custom/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should default the player and embed ids when the element omits them', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-video-id="6098765432"
        ></video-js>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Some plugins leave the account only in the loader script's url.
    it('should take the account from the loader script when the element has none', async () => {
      const value = html`
        <video-js data-video-id="6098765432"></video-js>
        <script src="https://players.brightcove.net/1234567890/default_default/index.min.js"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The older Brightcove syntax, and the only shape the 26 corpus feeds shipping the loader
  // without a `<video-js>` element actually use.
  describe('the video element form', () => {
    it('should mint the player page from a video element carrying the same attributes', async () => {
      const value = html`
        <video
          class="video-js"
          data-account="1234567890"
          data-video-id="6098765432"
          controls
        ></video>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A video carrying a real file is a working video, so a placeholder would be a downgrade.
    it('should leave a video element that names a file alone', async () => {
      const value = html`
        <video class="video-js" data-account="1234567890" data-video-id="6098765432">
          <source src="https://example.com/clip.mp4" type="video/mp4">
        </video>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should leave a video element with its own src alone', async () => {
      const value = html`
        <video
          class="video-js"
          data-account="1234567890"
          data-video-id="6098765432"
          src="https://example.com/clip.mp4"
        ></video>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no account can be found', async () => {
      const value = '<video-js data-video-id="6098765432"></video-js>'

      expect(await extract(value)).toBeUndefined()
    })

    // Video.js is a library anyone can use, so ids that are not Brightcove-shaped are left to
    // whoever else emitted them.
    it('should return undefined when the video id is not a brightcove id', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-video-id="my-clip"
        ></video-js>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the account is not a brightcove account', async () => {
      const value = html`
        <video-js
          data-account="acme"
          data-video-id="6098765432"
        ></video-js>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The other half of the contract asserted in rebuildVideoJsEmbeds.test.ts: that transform leaves
// a hosted player's element alone, and this is what then claims it. Asserted end to end because
// neither file knows about the other, so nothing but a run proves the two halves meet.
describeForEachParser('brightcove video-js through the pipeline', (parseHtml) => {
  it('should become a placeholder the element alone could not produce', async () => {
    const value = html`
      <video-js
        data-account="1234567890"
        data-video-id="6098765432"
      ></video-js>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    const expected = html`
      <div
        data-embed-src="https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432"
        data-embed-provider="brightcove"
        data-embed-id="6098765432"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
