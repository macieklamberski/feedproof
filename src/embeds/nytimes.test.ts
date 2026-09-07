import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { nytimesIframeEmbedResolver, nytimesResolveEmbed } from './nytimes.js'

describe('nytimesResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from the player url', () => {
      const value =
        'https://www.nytimes.com/video/players/offsite/index.html?videoId=100000004460561'
      const expected: EmbedResolverResult = {
        provider: 'nytimes',
        id: '100000004460561',
        src: 'https://www.nytimes.com/video/players/offsite/index.html?videoId=100000004460561',
        ratio: '16/9',
      }

      expect(nytimesResolveEmbed(value)).toEqual(expected)
    })

    it('should move a Brightcove-era player url onto the current player', () => {
      const value =
        'http://graphics8.nytimes.com/bcvideo/1.0/iframe/embed.html?videoId=1247464583973&playerType=embed'
      const expected: EmbedResolverResult = {
        provider: 'nytimes',
        id: '1247464583973',
        src: 'https://www.nytimes.com/video/players/offsite/index.html?videoId=1247464583973',
        ratio: '16/9',
      }

      expect(nytimesResolveEmbed(value)).toEqual(expected)
    })

    it('should take the player from the graphics host', () => {
      const value =
        'https://graphics8.nytimes.com/video/players/offsite/index.html?videoId=100000004077071'
      const expected: EmbedResolverResult = {
        provider: 'nytimes',
        id: '100000004077071',
        src: 'https://www.nytimes.com/video/players/offsite/index.html?videoId=100000004077071',
        ratio: '16/9',
      }

      expect(nytimesResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for the video page itself', () => {
      const value = 'https://www.nytimes.com/video/arts/1247464583973/critics-picks-safe.html'

      expect(nytimesResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a player naming no video', () => {
      const value = 'https://www.nytimes.com/video/players/offsite/index.html'

      expect(nytimesResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not numeric', () => {
      const value = 'https://www.nytimes.com/video/players/offsite/index.html?videoId=latest'

      expect(nytimesResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value =
        'https://www.nytimes.com.evil.test/video/players/offsite/index.html?videoId=100000004460561'

      expect(nytimesResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('nytimesIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, nytimesIframeEmbedResolver)

  // The snippet states 480 by 321, which is the carrier's size and wins over the ratio.
  it('should resolve the pasted player iframe', async () => {
    const value = html`
      <iframe
        title="New York Times Video - Embed Player"
        width="480"
        height="321"
        id="nyt_video_player"
        src="https://www.nytimes.com/video/players/offsite/index.html?videoId=100000007370133"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'nytimes',
      id: '100000007370133',
      src: 'https://www.nytimes.com/video/players/offsite/index.html?videoId=100000007370133',
      width: 480,
      height: 321,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a foreign host carrying the same path', async () => {
    const value =
      '<iframe src="https://evil.test/www.nytimes.com/video/players/offsite/index.html?videoId=100000007370133"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
