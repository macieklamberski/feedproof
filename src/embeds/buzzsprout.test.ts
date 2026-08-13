import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  buzzsproutIframeEmbedResolver,
  buzzsproutResolveEmbed,
  buzzsproutScriptEmbedResolver,
} from './buzzsprout.js'

describe('buzzsproutResolveEmbed', () => {
  it('should build the placeholder from an episode player url', () => {
    const value =
      'https://www.buzzsprout.com/1735722/episodes/8166676-mahler-symphony?client_source=small_player&iframe=true'
    const expected: EmbedResolverResult = {
      provider: 'buzzsprout',
      id: '1735722/8166676',
      src: 'https://www.buzzsprout.com/1735722/8166676?iframe=true',
      url: 'https://www.buzzsprout.com/1735722/8166676',
      height: 200,
    }

    expect(buzzsproutResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a show-level url', () => {
    const value = 'https://www.buzzsprout.com/1735722'

    expect(buzzsproutResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a lookalike host', () => {
    const value = 'https://buzzsprout.com.evil.test/1735722/8166676'

    expect(buzzsproutResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('buzzsproutScriptEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(buzzsproutScriptEmbedResolver.selector)

    return element
      ? (buzzsproutScriptEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('happy paths', () => {
    it('should build the placeholder from the plain script form', () => {
      const value =
        '<script src="https://www.buzzsprout.com/231452/19565923.js?container_id=buzzsprout-player-19565923&player=small"></script>'
      const expected: EmbedResolverResult = {
        provider: 'buzzsprout',
        id: '231452/19565923',
        src: 'https://www.buzzsprout.com/231452/19565923?iframe=true',
        url: 'https://www.buzzsprout.com/231452/19565923',
        height: 200,
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should build the placeholder from the episodes-slug form', () => {
      const value =
        '<script charset="utf-8" src="https://www.buzzsprout.com/42610/episodes/19141080-dreampod-150-mike-tucker.js?container_id=buzzsprout-player-19141080"></script>'
      const expected: EmbedResolverResult = {
        provider: 'buzzsprout',
        id: '42610/19141080',
        src: 'https://www.buzzsprout.com/42610/19141080?iframe=true',
        url: 'https://www.buzzsprout.com/42610/19141080',
        height: 200,
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    // The show-level embed carries no episode id, so there is nothing to resolve it to.
    it('should return undefined for the show-level script', () => {
      const value = '<script src="https://www.buzzsprout.com/231452.js?player=large"></script>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value = '<script src="https://buzzsprout.com.evil.test/231452/19565923.js"></script>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-numeric episode segment', () => {
      const value = '<script src="https://www.buzzsprout.com/231452/about.js"></script>'

      expect(extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('buzzsproutIframeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(buzzsproutIframeEmbedResolver.selector)

    return element
      ? (buzzsproutIframeEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  it('should resolve a direct player iframe to the same placeholder', () => {
    const value =
      '<iframe src="https://www.buzzsprout.com/1735722/episodes/8166676-mahler-symphony?client_source=small_player&iframe=true" width="100%" height="200"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'buzzsprout',
      id: '1735722/8166676',
      src: 'https://www.buzzsprout.com/1735722/8166676?iframe=true',
      url: 'https://www.buzzsprout.com/1735722/8166676',
      height: 200,
    }

    expect(extract(value)).toEqual(expected)
  })
})
