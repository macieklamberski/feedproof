import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  foxnewsIframeEmbedResolver,
  foxnewsResolveEmbed,
  foxnewsScriptEmbedResolver,
} from './foxnews.js'

describe('foxnewsResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from the script url', () => {
      const value = 'https://video.foxnews.com/v/embed.js?id=5406119088001&w=466&h=263'
      const expected: EmbedResolverResult = {
        provider: 'foxnews',
        id: '5406119088001',
        src: 'https://video.foxnews.com/v/video-embed.html?video_id=5406119088001',
        url: 'https://www.foxnews.com/video/5406119088001',
        ratio: '16/9',
      }

      expect(foxnewsResolveEmbed(value)).toEqual(expected)
    })

    // The embedding page's location and referrer ride along in the pasted iframe and are
    // dropped with the rest of the query.
    it('should build the placeholder from the embed page url', () => {
      const value =
        'https://video.foxnews.com/v/video-embed.html?video_id=6178327154001&loc=example.com&ref=https%3A%2F%2Fexample.com%2Fpost%2F&_xcf='
      const expected: EmbedResolverResult = {
        provider: 'foxnews',
        id: '6178327154001',
        src: 'https://video.foxnews.com/v/video-embed.html?video_id=6178327154001',
        url: 'https://www.foxnews.com/video/6178327154001',
        ratio: '16/9',
      }

      expect(foxnewsResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for the video page itself', () => {
      const value = 'https://video.foxnews.com/v/5406119088001/'

      expect(foxnewsResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a script carrying no id', () => {
      const value = 'https://video.foxnews.com/v/embed.js?w=466&h=263'

      expect(foxnewsResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not numeric', () => {
      const value = 'https://video.foxnews.com/v/embed.js?id=latest'

      expect(foxnewsResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value = 'https://video.foxnews.com.evil.test/v/embed.js?id=5406119088001'

      expect(foxnewsResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('foxnewsScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, foxnewsScriptEmbedResolver)

  describe('happy paths', () => {
    it('should build the placeholder from the scheme-relative snippet', async () => {
      const value = html`
        <script
          type="text/javascript"
          src="//video.foxnews.com/v/embed.js?id=5406119088001&#038;w=466&#038;h=263"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'foxnews',
        id: '5406119088001',
        src: 'https://video.foxnews.com/v/video-embed.html?video_id=5406119088001',
        url: 'https://www.foxnews.com/video/5406119088001',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<script src="https://evil.test/video.foxnews.com/v/embed.js?id=5406119088001"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('foxnewsIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, foxnewsIframeEmbedResolver)

  // The pasted iframe states 640 by 360, which is the carrier's size and wins over the ratio.
  it('should resolve the pasted player iframe', async () => {
    const value = html`
      <iframe
        src="https://video.foxnews.com/v/video-embed.html?video_id=6178327154001&loc=example.com"
        width="640"
        height="360"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'foxnews',
      id: '6178327154001',
      src: 'https://video.foxnews.com/v/video-embed.html?video_id=6178327154001',
      url: 'https://www.foxnews.com/video/6178327154001',
      width: 640,
      height: 360,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore an iframe framing the video page', async () => {
    const value = '<iframe src="https://video.foxnews.com/v/5406119088001/"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
