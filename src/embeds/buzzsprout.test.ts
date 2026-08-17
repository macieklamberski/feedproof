import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
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
  const extract = resolverExtractor(parseHtml, buzzsproutScriptEmbedResolver)

  describe('happy paths', () => {
    it('should build the placeholder from the plain script form', async () => {
      const value = html`
        <script
          src="https://www.buzzsprout.com/231452/19565923.js?container_id=buzzsprout-player-19565923&player=small"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'buzzsprout',
        id: '231452/19565923',
        src: 'https://www.buzzsprout.com/231452/19565923?iframe=true',
        url: 'https://www.buzzsprout.com/231452/19565923',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should build the placeholder from the episodes-slug form', async () => {
      const value = html`
        <script
          charset="utf-8"
          src="https://www.buzzsprout.com/42610/episodes/19141080-dreampod-150-mike-tucker.js?container_id=buzzsprout-player-19141080"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'buzzsprout',
        id: '42610/19141080',
        src: 'https://www.buzzsprout.com/42610/19141080?iframe=true',
        url: 'https://www.buzzsprout.com/42610/19141080',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('happy paths, show player', () => {
    // The div this script fills is empty, so refusing it deletes the player outright rather than
    // leaving a generic placeholder the way the url-keyed resolver does.
    it('should build the show placeholder from a script naming the podcast alone', async () => {
      const value = html`
        <script
          src="https://www.buzzsprout.com/231452.js?container_id=buzzsprout-large-player&player=large"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'buzzsprout',
        id: '231452',
        src: 'https://www.buzzsprout.com/231452?iframe=true',
        url: 'https://www.buzzsprout.com/231452',
        height: 375,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined for a lookalike host', async () => {
      const value = '<script src="https://buzzsprout.com.evil.test/231452/19565923.js"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-numeric episode segment', async () => {
      const value = '<script src="https://www.buzzsprout.com/231452/about.js"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('buzzsproutIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, buzzsproutIframeEmbedResolver)

  it('should resolve a direct player iframe to the same placeholder', async () => {
    const value = html`
      <iframe
        src="https://www.buzzsprout.com/1735722/episodes/8166676-mahler-symphony?client_source=small_player&iframe=true"
        width="100%"
        height="200"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'buzzsprout',
      id: '1735722/8166676',
      src: 'https://www.buzzsprout.com/1735722/8166676?iframe=true',
      url: 'https://www.buzzsprout.com/1735722/8166676',
      height: 200,
    }

    expect(await extract(value)).toEqual(expected)
  })
})
