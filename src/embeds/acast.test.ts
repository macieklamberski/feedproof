import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { acastEmbedResolver } from './acast.js'

describeForEachParser('acastEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, acastEmbedResolver)

  describe('the episode player', () => {
    it('should resolve the current embed code and drop its dollar prefix', async () => {
      const value = html`
        <iframe
          src="https://embed.acast.com/$/63d3cb7a675193001164ef5d/67ceebb0d64d9d8e86dcddea?"
          frameBorder="0"
          width="100%"
          height="190px"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'acast',
        id: '63d3cb7a675193001164ef5d/67ceebb0d64d9d8e86dcddea',
        src: 'https://embed.acast.com/63d3cb7a675193001164ef5d/67ceebb0d64d9d8e86dcddea',
        height: 190,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the plain show and episode path with a uuid show', async () => {
      const value = html`
        <iframe
          src="https://embed.acast.com/e6282aaf-1856-5081-9647-61ca6e74ad82/6389785c6507490011249108"
          frameborder="0"
          width="100%"
          height="110px"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'acast',
        id: 'e6282aaf-1856-5081-9647-61ca6e74ad82/6389785c6507490011249108',
        src: 'https://embed.acast.com/e6282aaf-1856-5081-9647-61ca6e74ad82/6389785c6507490011249108',
        height: 190,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a slug show and episode and drop the display query', async () => {
      const value = html`
        <iframe
          src="https://embed.acast.com/homebrewshow/homebrew-6?theme=default&cover=1&latest=1"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'acast',
        id: 'homebrewshow/homebrew-6',
        src: 'https://embed.acast.com/homebrewshow/homebrew-6',
        height: 190,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the older player host onto the embed host', async () => {
      const value = html`
        <iframe
          src="https://player.acast.com/5cd07163ad694b18367aeb03/episodes/homebrew-6?theme=default&cover=1&latest=1"
          frameborder="0"
          width="100%"
          height="110px"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'acast',
        id: '5cd07163ad694b18367aeb03/homebrew-6',
        src: 'https://embed.acast.com/5cd07163ad694b18367aeb03/homebrew-6',
        height: 190,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep its own height over the size an older snippet states', async () => {
      const value = html`
        <iframe
          src="https://player.acast.com/5abd5289e88d239f520d3378/episodes/5efe1045a43ded6858b856d8#?secret=Ka4pKttEzU"
          width="640"
          height="110"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'acast',
        id: '5abd5289e88d239f520d3378/5efe1045a43ded6858b856d8',
        src: 'https://embed.acast.com/5abd5289e88d239f520d3378/5efe1045a43ded6858b856d8',
        height: 190,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the show playlist', () => {
    it('should resolve a show alone', async () => {
      const value = html`
        <iframe
          src="https://embed.acast.com/66280c8cd1e1b20011ad73c5?episode-order=desc"
          width="100%"
          height="190px"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'acast',
        id: '66280c8cd1e1b20011ad73c5',
        src: 'https://embed.acast.com/66280c8cd1e1b20011ad73c5',
        height: 190,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a show behind the dollar prefix', async () => {
      const value = html`
        <iframe
          src="https://embed.acast.com/$/e6282aaf-1856-5081-9647-61ca6e74ad82"
          width="100%"
          height="120px"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'acast',
        id: 'e6282aaf-1856-5081-9647-61ca6e74ad82',
        src: 'https://embed.acast.com/e6282aaf-1856-5081-9647-61ca6e74ad82',
        height: 190,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('deliberate non-resolutions', () => {
    it('should return undefined for the player host without an episodes segment', async () => {
      const value = html`
        <iframe src="https://player.acast.com/5cd07163ad694b18367aeb03/homebrew-6"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for the player host naming a show alone', async () => {
      const value = '<iframe src="https://player.acast.com/5cd07163ad694b18367aeb03"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a bare dollar prefix', async () => {
      const value = '<iframe src="https://embed.acast.com/$/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a traversal in the episode', async () => {
      const value = '<iframe src="https://embed.acast.com/homebrewshow/..%2Fevil"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an id holding a dot', async () => {
      const value = '<iframe src="https://embed.acast.com/show.name/episode"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should not claim another host spelling the embed host in its path', async () => {
      const value = html`
        <iframe src="https://evil.test/embed.acast.com/63d3cb7a675193001164ef5d/67ceebb0d64d9d8e86dcddea"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not claim the show pages host', async () => {
      const value = html`
        <iframe src="https://shows.acast.com/63d3cb7a675193001164ef5d/episodes/67ceebb0d64d9d8e86dcddea"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
