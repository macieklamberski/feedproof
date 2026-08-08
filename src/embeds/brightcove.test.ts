import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { brightcoveEmbedResolver } from './brightcove.js'

describeForEachParser('brightcoveEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(brightcoveEmbedResolver.selector)

    return element ? (brightcoveEmbedResolver.extract(element) as EmbedResolverResult) : undefined
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
