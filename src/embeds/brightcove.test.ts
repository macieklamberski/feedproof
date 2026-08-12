import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  brightcoveFlashEmbedResolver,
  brightcoveResolveEmbed,
  brightcoveVideoJsEmbedResolver,
} from './brightcove.js'

describeForEachParser('brightcoveVideoJsEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(brightcoveVideoJsEmbedResolver.selector)

    return element
      ? (brightcoveVideoJsEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('happy paths', () => {
    it('should mint the player url from the element attributes', () => {
      const value =
        '<video-js id="6274747546001" data-video-id="6274747546001" data-account="5436121860001" data-player="default" data-embed="default" class="video-js" controls></video-js>'
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '6274747546001',
        src: 'https://players.brightcove.net/5436121860001/default_default/index.html?videoId=6274747546001',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should read the account from the loader script when the element lacks it', () => {
      const value = html`
        <video-js id="brightcove-embed-player-6388838370112" data-video-id="6388838370112" data-embed="default" class="video-js" controls></video-js>
        <script src="https://players.brightcove.net/6057277732001/experience_default/index.min.js"></script>
      `

      expect(extract(value)?.src).toBe(
        'https://players.brightcove.net/6057277732001/default_default/index.html?videoId=6388838370112',
      )
    })

    it('should default the player and embed segments', () => {
      const value =
        '<video-js data-video-id="6310428365112" data-account="6314321213001"></video-js>'

      expect(extract(value)?.src).toBe(
        'https://players.brightcove.net/6314321213001/default_default/index.html?videoId=6310428365112',
      )
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no account is recoverable', () => {
      const value = '<video-js data-video-id="6388838370112" data-embed="default"></video-js>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty video id', () => {
      const value = '<video-js data-video-id="" data-account="6314321213001"></video-js>'

      expect(extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('brightcoveFlashEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(brightcoveFlashEmbedResolver.selector)

    return element
      ? (brightcoveFlashEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('happy paths', () => {
    it('should read the account from the url and the video id from flashVars', () => {
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
      }

      expect(extract(value)).toEqual(expected)
    })

    // The same two ids, split the other way: some embeds park flashVars in a <param>.
    it('should read flashVars from a sibling param', () => {
      const value = html`
        <object width="300" height="250">
          <param name="flashVars" value="@videoPlayer=19521637001&domain=embed" />
          <embed
            src="http://c.brightcove.com/services/viewer/federated_f9/19517958001?publisherID=1660622131"
          />
        </object>
      `
      const element = parseHtml(value).querySelector('embed')
      const result = element
        ? (brightcoveFlashEmbedResolver.extract(element) as EmbedResolverResult)
        : undefined

      expect(result).toMatchObject({ provider: 'brightcove', id: '19521637001' })
    })
  })

  describe('sad paths', () => {
    it('should ignore a federated url with no video id anywhere', () => {
      const value =
        '<embed src="http://c.brightcove.com/services/viewer/federated_f9/19517958001?publisherID=1660622131">'

      expect(extract(value)).toBeUndefined()
    })

    it('should ignore a video id given as an account reference', () => {
      const value =
        '<embed src="http://c.brightcove.com/services/viewer/federated_f9/1?publisherID=1660622131" flashVars="@videoPlayer=ref:my-video">'

      expect(extract(value)).toBeUndefined()
    })

    it('should ignore a brightcove url that is not a federated player', () => {
      const value = '<embed src="http://admin.brightcove.com/viewer/us1/something.swf">'

      expect(extract(value)).toBeUndefined()
    })
  })
})

describe('brightcoveResolveEmbed', () => {
  const playerUrl =
    'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432'

  describe('happy paths', () => {
    it('should read the account and video id out of the player url', () => {
      expect(brightcoveResolveEmbed(playerUrl)).toEqual({
        provider: 'brightcove',
        id: '6098765432',
        src: playerUrl,
      })
    })

    it('should keep a named player rather than assuming the default', () => {
      const value =
        'https://players.brightcove.net/1234567890/AbCdEf123_custom/index.html?videoId=6098765432'

      expect(brightcoveResolveEmbed(value)).toMatchObject({
        src: 'https://players.brightcove.net/1234567890/AbCdEf123_custom/index.html?videoId=6098765432',
      })
    })

    it('should drop the other player parameters', () => {
      const value = `${playerUrl}&autoplay=true&muted=true`

      expect(brightcoveResolveEmbed(value)).toMatchObject({ src: playerUrl })
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
      expect(brightcoveResolveEmbed('https://[')).toBeUndefined()
    })
  })
})
