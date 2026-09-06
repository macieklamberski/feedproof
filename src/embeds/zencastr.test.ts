import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
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

// The resolvers only reach a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('zencastr through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim the player blockquote the default list reaches', async () => {
    const value = html`
      <blockquote
        class="zenplayer"
        data-episode-href="https://zencastr.com/embed/0C_Xr4ma"
      ></blockquote>
    `
    const expected = html`
      <div
        data-embed-id="0C_Xr4ma"
        data-embed-provider="zencastr"
        data-embed-src="https://zencastr.com/embed/0C_Xr4ma"
        data-embed-ratio="480/480"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // Zencastr serves its episode files from `redirect.zencastr.com`, which listing
  // `zencastr.com` claims. Only the `embed` route check keeps the audio playable.
  it('should leave a zencastr audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://redirect.zencastr.com/r/episode/64de3da78e19f12c49e2fd18/audio-files/6450f854d339593de5629577/ef3d2453-c708-476d-bf9b-4f5749ad3098.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://redirect.zencastr.com/r/episode/64de3da78e19f12c49e2fd18/audio-files/6450f854d339593de5629577/ef3d2453-c708-476d-bf9b-4f5749ad3098.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
