import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { flourishEmbedResolver } from './flourish.js'

describeForEachParser('flourishEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(flourishEmbedResolver.selector)

    return element ? (flourishEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should mint the embed url and carry the noscript thumbnail', () => {
      const value = html`
        <div class="flourish-embed flourish-chart" data-src="visualisation/29541520">
          <script src="https://public.flourish.studio/resources/embed.js"></script>
          <noscript>
            <img src="https://public.flourish.studio/visualisation/29541520/thumbnail" width="100%" alt="chart visualization" />
          </noscript>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: '29541520',
        src: 'https://flo.uri.sh/visualisation/29541520/embed',
        url: 'https://public.flourish.studio/visualisation/29541520/',
        thumbnail: 'https://public.flourish.studio/visualisation/29541520/thumbnail',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should carry a thumbnail img that sits outside a noscript', () => {
      const value = html`
        <div class="flourish-embed flourish-tournament" data-src="visualisation/29512053">
          <img src="https://public.flourish.studio/visualisation/29512053/thumbnail" width="100%" alt="tournament visualization" />
        </div>
      `

      expect(extract(value)).toMatchObject({
        thumbnail: 'https://public.flourish.studio/visualisation/29512053/thumbnail',
      })
    })

    it('should accept a data-src with a cache-busting query', () => {
      const value = html`
        <div class="flourish-embed flourish-chart" data-src="visualisation/29310925?431563"></div>
      `

      expect(extract(value)).toMatchObject({
        id: '29310925',
        src: 'https://flo.uri.sh/visualisation/29310925/embed',
      })
    })
  })

  describe('edge cases', () => {
    it('should omit the thumbnail when the div wraps no img', () => {
      const value = html`<div class="flourish-embed" data-src="visualisation/143199"></div>`
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: '143199',
        src: 'https://flo.uri.sh/visualisation/143199/embed',
        url: 'https://public.flourish.studio/visualisation/143199/',
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a full-url data-src', () => {
      const value = html`
        <div class="flourish-embed" data-src="https://evil.test/visualisation/29541520"></div>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-visualisation path', () => {
      const value = html`<div class="flourish-embed" data-src="story/123456"></div>`

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-numeric id', () => {
      const value = html`<div class="flourish-embed" data-src="visualisation/../evil"></div>`

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty data-src', () => {
      const value = html`<div class="flourish-embed" data-src=""></div>`

      expect(extract(value)).toBeUndefined()
    })

    it('should not match a div without data-src', () => {
      const value = html`<div class="flourish-embed"></div>`

      expect(extract(value)).toBeUndefined()
    })
  })
})
