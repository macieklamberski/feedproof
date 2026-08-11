import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { podigeeEmbedResolver } from './podigee.js'

describeForEachParser('podigeeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(podigeeEmbedResolver.selector)

    return element ? (podigeeEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  const script = (configuration: string) =>
    `<script class="podigee-podcast-player" src="https://player.podigee-cdn.net/podcast-player/javascripts/podigee-podcast-player.js" data-configuration="${configuration}"></script>`

  describe('happy paths', () => {
    // The loader's data-configuration is the player url itself, so nothing needs executing.
    it('should take the player url from data-configuration', () => {
      const value = script('https://theshow.podigee.io/42-an-episode/embed?context=external')

      expect(extract(value)).toEqual({
        provider: 'podigee',
        id: 'theshow/42-an-episode',
        src: 'https://theshow.podigee.io/42-an-episode/embed?context=external',
      })
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a podigee url naming no episode', () => {
      expect(extract(script('https://theshow.podigee.io/'))).toBeUndefined()
    })

    // 14 of 100 corpus feeds point the attribute at an inline config object instead of a url.
    it('should ignore an inline configuration reference', () => {
      expect(extract(script('podigee'))).toBeUndefined()
      expect(extract(script('playerConfiguration'))).toBeUndefined()
    })

    it('should ignore a configuration url on another host', () => {
      expect(extract(script('https://example.com/player/embed'))).toBeUndefined()
    })
  })
})
