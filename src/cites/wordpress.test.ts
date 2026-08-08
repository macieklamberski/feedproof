import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { wordpressCiteResolver } from './wordpress.js'

describeForEachParser('wordpressCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, wordpressCiteResolver)

  describe('happy paths', () => {
    it('should extract the url and title from the blockquote link', async () => {
      const value = html`
        <blockquote class="wp-embedded-content" data-secret="JUePPMjf2l">
          <a href="https://example.com/post/">Post title</a>
        </blockquote>
      `
      const expected: CiteResolverResult = {
        provider: 'wordpress',
        url: 'https://example.com/post/',
        title: 'Post title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the link when it sits inside a paragraph', async () => {
      const value = html`
        <blockquote class="wp-embedded-content" data-secret="oMP8H3FwCS">
          <p><a href="https://example.com/other/">Other post</a></p>
        </blockquote>
      `
      const expected: CiteResolverResult = {
        provider: 'wordpress',
        url: 'https://example.com/other/',
        title: 'Other post',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <blockquote class="wp-embedded-content">
          <a href="https://example.com/post/"> Padded title </a>
        </blockquote>
      `

      expect(await extract(value)).toMatchObject({
        title: 'Padded title',
      })
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the blockquote has no link', async () => {
      const value = html`
        <blockquote class="wp-embedded-content">Post title</blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the link has no text', async () => {
      const value = html`
        <blockquote class="wp-embedded-content">
          <a href="https://example.com/post/"></a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a plain blockquote', async () => {
      const value = html`
        <blockquote>
          <a href="https://example.com/post/">Quoted</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
