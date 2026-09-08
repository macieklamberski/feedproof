import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { bbcIframeEmbedResolver, bbcResolveEmbed } from './bbc.js'

describe('bbcResolveEmbed', () => {
  describe('happy paths', () => {
    it('should move the pasted news player onto the form it redirects to', () => {
      const value = 'https://www.bbc.com/news/av/embed/p06sf6tr/46292361'
      const expected: EmbedResolverResult = {
        provider: 'bbc',
        id: 'p06sf6tr',
        src: 'https://www.bbc.com/news/av-embeds/46292361/vpid/p06sf6tr',
        ratio: '16/9',
      }

      expect(bbcResolveEmbed(value)).toEqual(expected)
    })

    it('should take the news player on the uk host', () => {
      const value = 'https://www.bbc.co.uk/news/av-embeds/47160831/vpid/p0707cts'
      const expected: EmbedResolverResult = {
        provider: 'bbc',
        id: 'p0707cts',
        src: 'https://www.bbc.com/news/av-embeds/47160831/vpid/p0707cts',
        ratio: '16/9',
      }

      expect(bbcResolveEmbed(value)).toEqual(expected)
    })

    it('should pass the World Service player through', () => {
      const value = 'https://www.bbc.co.uk/ws/av-embeds/articles/cy8k2nd7e9no/p0lq8w8f/en-GB/'
      const expected: EmbedResolverResult = {
        provider: 'bbc',
        id: 'p0lq8w8f',
        src: 'https://www.bbc.com/ws/av-embeds/articles/cy8k2nd7e9no/p0lq8w8f/en-GB/',
        ratio: '16/9',
      }

      expect(bbcResolveEmbed(value)).toEqual(expected)
    })

    it('should take the programmes player with no size', () => {
      const value = 'http://www.bbc.co.uk/programmes/p01tclqw/player'
      const expected: EmbedResolverResult = {
        provider: 'bbc',
        id: 'p01tclqw',
        src: 'https://www.bbc.co.uk/programmes/p01tclqw/player',
      }

      expect(bbcResolveEmbed(value)).toEqual(expected)
    })

    // The article numbers in the corpus are eight digits and BBC keeps adding them.
    it('should take a news player whose article number runs past nine digits', () => {
      const value = 'https://www.bbc.com/news/av-embeds/4629236104/vpid/p06sf6tr'
      const expected: EmbedResolverResult = {
        provider: 'bbc',
        id: 'p06sf6tr',
        src: 'https://www.bbc.com/news/av-embeds/4629236104/vpid/p06sf6tr',
        ratio: '16/9',
      }

      expect(bbcResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // BBC's newer article ids are a different space entirely and name no news player.
    it('should return undefined for a lettered article id on the news player', () => {
      const value = 'https://www.bbc.com/news/av-embeds/cx2g0z9q7lno/vpid/p06sf6tr'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a route word standing where the article number goes', () => {
      const value = 'https://www.bbc.com/news/av/embed/p06sf6tr/av-embeds'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for the news page itself', () => {
      const value = 'https://www.bbc.com/news/av/science-environment-47799042'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a news player naming no article', () => {
      const value = 'https://www.bbc.com/news/av/embed/p06sf6tr'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a news player whose pid is not one', () => {
      const value = 'https://www.bbc.com/news/av-embeds/46292361/vpid/latest'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a World Service player naming no pid', () => {
      const value = 'https://www.bbc.com/ws/av-embeds/articles/cy8k2nd7e9no/en-GB/'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for the programme page itself', () => {
      const value = 'https://www.bbc.co.uk/programmes/p01tclqw'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value = 'https://www.bbc.com.evil.test/news/av/embed/p06sf6tr/46292361'

      expect(bbcResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('bbcIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, bbcIframeEmbedResolver)

  describe('happy paths', () => {
    // The snippet states 400 by 500 for a 16:9 player, and the measured ratio is preferred.
    it('should resolve the pasted news player iframe', async () => {
      const value = html`
        <iframe
          src="https://www.bbc.co.uk/news/av/embed/p0707cts/47160831"
          width="400"
          height="500"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bbc',
        id: 'p0707cts',
        src: 'https://www.bbc.com/news/av-embeds/47160831/vpid/p0707cts',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The programmes player states no size of its own, so the carrier's stands.
    it('should keep the stated size on the programmes player', async () => {
      const value = html`
        <iframe
          src="https://www.bbc.co.uk/programmes/p08s3bnj/player"
          width="640"
          height="360"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bbc',
        id: 'p08s3bnj',
        src: 'https://www.bbc.co.uk/programmes/p08s3bnj/player',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/www.bbc.com/news/av/embed/p06sf6tr/46292361"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// BBC serves podcast audio from subdomains of the two hosts the players sit on, and the enclosure
// probe offers each one to this resolver. Only the route words at the front of the path keep a
// playable file from becoming a placeholder no reader can play.
describeForEachParser('bbc through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a bbc media enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/vpid/p06sf6tr.mp3',
        type: 'audio/mpeg',
      },
    ]
    const expected = html`
      <audio data-enclosure="" controls src="https://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/vpid/p06sf6tr.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
