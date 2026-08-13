import { describe, expect, it } from 'bun:test'
import { describeForEachParser, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { podigeeEmbedResolver } from './podigee.js'

describeForEachParser('podigeeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podigeeEmbedResolver)

  const script = (configuration: string) =>
    `<script class="podigee-podcast-player" src="https://player.podigee-cdn.net/podcast-player/javascripts/podigee-podcast-player.js" data-configuration="${configuration}"></script>`

  describe('happy paths', () => {
    // The loader's data-configuration is the player url itself, so nothing needs executing.
    it('should take the player url from data-configuration', async () => {
      const value = script('https://theshow.podigee.io/42-an-episode/embed?context=external')
      const expected: EmbedResolverResult = {
        provider: 'podigee',
        id: 'theshow/42-an-episode',
        src: 'https://theshow.podigee.io/42-an-episode/embed?context=external',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a podigee url naming no episode', async () => {
      const value = script('https://theshow.podigee.io/')

      expect(await extract(value)).toBeUndefined()
    })

    // 14 of 100 corpus feeds point the attribute at an inline config object instead of a url.
    it('should ignore an inline configuration reference', async () => {
      expect(await extract(script('podigee'))).toBeUndefined()
      expect(await extract(script('playerConfiguration'))).toBeUndefined()
    })

    it('should ignore a configuration url on another host', async () => {
      const value = script('https://example.com/player/embed')

      expect(await extract(value)).toBeUndefined()
    })
  })
})
