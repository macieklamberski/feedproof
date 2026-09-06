import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { cnbcIframeEmbedResolver, cnbcResolveEmbed } from './cnbc.js'

describe('cnbcResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from the player url', () => {
      const value = 'https://player.cnbc.com/p/gZWlPC/cnbc_global?playertype=synd&byGuid=7000344703'
      const expected: EmbedResolverResult = {
        provider: 'cnbc',
        id: '7000344703',
        src: 'https://player.cnbc.com/p/gZWlPC/cnbc_global?playertype=synd&byGuid=7000344703',
        ratio: '16/9',
      }

      expect(cnbcResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for the Flash-era player on the other host', () => {
      const value =
        'http://plus.cnbc.com/rssvideosearch/action/player/id/3000025230/code/cnbcplayershare'

      expect(cnbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a player naming no clip', () => {
      const value = 'https://player.cnbc.com/p/gZWlPC/cnbc_global?playertype=synd'

      expect(cnbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a guid that is not numeric', () => {
      const value = 'https://player.cnbc.com/p/gZWlPC/cnbc_global?playertype=synd&byGuid=latest'

      expect(cnbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a path that is not a player', () => {
      const value = 'https://player.cnbc.com/p/gZWlPC/cnbc_global/extra?byGuid=7000344703'

      expect(cnbcResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value = 'https://player.cnbc.com.evil.test/p/gZWlPC/cnbc_global?byGuid=7000344703'

      expect(cnbcResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('cnbcIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, cnbcIframeEmbedResolver)

  // A publisher's own 100% by 580 box does not describe the player, so the ratio is preferred.
  it('should resolve the pasted player iframe', async () => {
    const value = html`
      <iframe
        src="https://player.cnbc.com/p/gZWlPC/cnbc_global?playertype=synd&amp;byGuid=7000313539"
        width="100%"
        height="580"
        scrolling="no"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'cnbc',
      id: '7000313539',
      src: 'https://player.cnbc.com/p/gZWlPC/cnbc_global?playertype=synd&byGuid=7000313539',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a foreign host carrying the same path', async () => {
    const value =
      '<iframe src="https://evil.test/player.cnbc.com/p/gZWlPC/cnbc_global?byGuid=7000313539"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
