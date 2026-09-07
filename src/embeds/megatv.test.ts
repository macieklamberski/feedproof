import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { megatvEmbedResolver } from './megatv.js'

describeForEachParser('megatvEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, megatvEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the share dialog snippet and keep the box it states', async () => {
      const value = html`
        <iframe
          src="https://www.megatv.com/embed/?p=2020687366"
          frameborder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          scrolling="no"
          width="560"
          height="315"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'megatv',
        id: '2020687366',
        src: 'https://www.megatv.com/embed/?p=2020687366',
        url: 'https://www.megatv.com/?p=687366',
        width: 560,
        height: 315,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state the ratio for a frame that declares no size', async () => {
      const value = html`
        <iframe
          loading="lazy"
          title="Mega Γεγονότα"
          src="https://www.megatv.com/embed/?p=20202420374"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'megatv',
        id: '20202420374',
        src: 'https://www.megatv.com/embed/?p=20202420374',
        url: 'https://www.megatv.com/?p=2420374',
        title: 'Mega Γεγονότα',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should drop the parameters the publisher added to the player', async () => {
      const value = html`
        <iframe src="https://www.megatv.com/embed/?p=2020747515&autoplay=1"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'megatv',
        id: '2020747515',
        src: 'https://www.megatv.com/embed/?p=2020747515',
        url: 'https://www.megatv.com/?p=747515',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/www.megatv.com/embed/?p=2020687366"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a player url naming no post', async () => {
      const value = '<iframe src="https://www.megatv.com/embed/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an id outside the numeric shape', async () => {
      const value = '<iframe src="https://www.megatv.com/embed/?p=evil"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a megatv url that is not the player', async () => {
      const value = '<iframe src="https://www.megatv.com/?p=687366"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // Five corpus embeds name posts under a mapping the prefix rule does not cover, so the
    // player is kept and no article page is guessed for them.
    it('should mint no page for an id without the post prefix', async () => {
      const value = '<iframe src="https://www.megatv.com/embed/?p=38626813"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'megatv',
        id: '38626813',
        src: 'https://www.megatv.com/embed/?p=38626813',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
