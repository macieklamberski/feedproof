import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  zencastrBlockquoteEmbedResolver,
  zencastrIframeEmbedResolver,
  zencastrResolveEmbed,
} from './zencastr.js'

describe('zencastrResolveEmbed', () => {
  it('should build the placeholder from the embed url', () => {
    const value = 'https://zencastr.com/embed/cK98nMcr'
    const expected: EmbedResolverResult = {
      provider: 'zencastr',
      id: 'cK98nMcr',
      src: 'https://zencastr.com/embed/cK98nMcr',
      ratio: '480/480',
    }

    expect(zencastrResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a page that is not the embed', () => {
    const value = 'https://zencastr.com/pricing'

    expect(zencastrResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for an id of the wrong shape', () => {
    const value = 'https://zencastr.com/embed/an-episode-slug'

    expect(zencastrResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a lookalike host', () => {
    const value = 'https://zencastr.com.evil.test/embed/cK98nMcr'

    expect(zencastrResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('zencastrBlockquoteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, zencastrBlockquoteEmbedResolver)

  describe('happy paths', () => {
    // The snippet fixes the box at 480 by 480 in its style; the square ratio is kept instead so
    // the player keeps its shape at any width.
    it('should build the placeholder from data-episode-href', async () => {
      const value = html`
        <blockquote
          class="zenplayer"
          data-episode-href="https://zencastr.com/embed/cK98nMcr"
          style="background: black; border-radius: 12px; width: 480px; height: 480px; position: relative; color: white; margin: 0;"
        >
          <img
            style="width: 120px; position: absolute;"
            src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="
          />
          <a
            href="https://zencastr.com/embed/cK98nMcr"
            target="_blank"
          >
            View on Zencastr
          </a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'zencastr',
        id: 'cK98nMcr',
        src: 'https://zencastr.com/embed/cK98nMcr',
        ratio: '480/480',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore an episode href on another host', async () => {
      const value = html`
        <blockquote
          class="zenplayer"
          data-episode-href="https://example.com/embed/cK98nMcr"
        ></blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('zencastrIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, zencastrIframeEmbedResolver)

  it('should resolve the iframe the loader builds', async () => {
    const value = html`
      <iframe
        title="Zencastr video player"
        src="https://zencastr.com/embed/cK98nMcr"
        style="width: 480px; height: 480px;"
        allowfullscreen=""
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'zencastr',
      id: 'cK98nMcr',
      src: 'https://zencastr.com/embed/cK98nMcr',
      ratio: '480/480',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a foreign host carrying the same path', async () => {
    const value = '<iframe src="https://evil.test/zencastr.com/embed/cK98nMcr"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
