import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  flourishIframeEmbedResolver,
  flourishResolveEmbed,
  flourishWidgetEmbedResolver,
} from './flourish.js'

describeForEachParser('flourishWidgetEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, flourishWidgetEmbedResolver)

  describe('happy paths', () => {
    it('should mint the embed url and carry the noscript thumbnail', async () => {
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
        id: 'visualisation/29541520',
        src: 'https://flo.uri.sh/visualisation/29541520/embed',
        url: 'https://public.flourish.studio/visualisation/29541520/',
        thumbnail: 'https://public.flourish.studio/visualisation/29541520/thumbnail',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry a thumbnail img that sits outside a noscript', async () => {
      const value = html`
        <div class="flourish-embed flourish-tournament" data-src="visualisation/29512053">
          <img src="https://public.flourish.studio/visualisation/29512053/thumbnail" width="100%" alt="tournament visualization" />
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'visualisation/29512053',
        src: 'https://flo.uri.sh/visualisation/29512053/embed',
        url: 'https://public.flourish.studio/visualisation/29512053/',
        thumbnail: 'https://public.flourish.studio/visualisation/29512053/thumbnail',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should mint a story from the same grammar', async () => {
      const value = html`
        <div class="flourish-embed flourish-story" data-src="story/3641056">
          <script src="https://public.flourish.studio/resources/embed.js"></script>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'story/3641056',
        src: 'https://flo.uri.sh/story/3641056/embed',
        url: 'https://public.flourish.studio/story/3641056/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should accept a data-src with a cache-busting query', async () => {
      const value = html`
        <div class="flourish-embed flourish-chart" data-src="visualisation/29310925?431563"></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'visualisation/29310925',
        src: 'https://flo.uri.sh/visualisation/29310925/embed',
        url: 'https://public.flourish.studio/visualisation/29310925/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should omit the thumbnail when the div wraps no img', async () => {
      const value = html`<div class="flourish-embed" data-src="visualisation/143199"></div>`
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'visualisation/143199',
        src: 'https://flo.uri.sh/visualisation/143199/embed',
        url: 'https://public.flourish.studio/visualisation/143199/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a full-url data-src', async () => {
      const value = html`
        <div class="flourish-embed" data-src="https://evil.test/visualisation/29541520"></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an unknown resource kind', async () => {
      const value = html`<div class="flourish-embed" data-src="dashboard/123456"></div>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-numeric id', async () => {
      const value = html`<div class="flourish-embed" data-src="visualisation/../evil"></div>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty data-src', async () => {
      const value = html`<div class="flourish-embed" data-src=""></div>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a div without data-src', async () => {
      const value = html`<div class="flourish-embed"></div>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('flourishIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, flourishIframeEmbedResolver)

  describe('happy paths', () => {
    it('should resolve a visualisation player on the canonical host', async () => {
      const value = html`
        <iframe src="https://flo.uri.sh/visualisation/29132382/embed" width="600" height="400"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'visualisation/29132382',
        src: 'https://flo.uri.sh/visualisation/29132382/embed',
        url: 'https://public.flourish.studio/visualisation/29132382/',
        width: 600,
        height: 400,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a story player', async () => {
      const value = html`<iframe src="https://flo.uri.sh/story/3689731/embed"></iframe>`
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'story/3689731',
        src: 'https://flo.uri.sh/story/3689731/embed',
        url: 'https://public.flourish.studio/story/3689731/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The share host answers with a shim that rewrites the location to flo.uri.sh, so both
    // spellings name the same player and only the canonical one is minted.
    it('should mint the canonical host from the share host', async () => {
      const value = html`
        <iframe src="https://public.flourish.studio/visualisation/29541520/embed"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'visualisation/29541520',
        src: 'https://flo.uri.sh/visualisation/29541520/embed',
        url: 'https://public.flourish.studio/visualisation/29541520/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // WordPress wraps an oEmbed frame and appends its postMessage handshake to the url. The
    // fragment is WordPress's, not the player's, so it does not survive into the minted src.
    it('should drop the WordPress handshake fragment', async () => {
      const value = html`
        <iframe
          class="wp-embedded-content"
          src="https://flo.uri.sh/visualisation/29310925/embed#?secret=aBcD1234"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'flourish',
        id: 'visualisation/29310925',
        src: 'https://flo.uri.sh/visualisation/29310925/embed',
        url: 'https://public.flourish.studio/visualisation/29310925/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The host substring sits in a foreign host's path, so the selector matches and the host
    // check is what refuses it.
    it('should return undefined for a lookalike host carrying the path', async () => {
      const value = html`
        <iframe src="https://evil.test/flo.uri.sh/visualisation/29132382/embed"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an unknown resource kind', async () => {
      const value = html`<iframe src="https://flo.uri.sh/dashboard/29132382/embed"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-numeric id', async () => {
      const value = html`<iframe src="https://flo.uri.sh/visualisation/evil/embed"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    // The share page is the thing the placeholder links to, not a player to frame.
    it('should return undefined for a share page', async () => {
      const value = html`<iframe src="https://public.flourish.studio/visualisation/29541520/"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The exported url reader, which the iframe resolver wraps. The factory gates the host before
// this runs, so these cover the contract it states for a caller composing its own list.
describe('flourishResolveEmbed', () => {
  it('should resolve a player url', () => {
    const value = 'https://flo.uri.sh/visualisation/29132382/embed'
    const expected: EmbedResolverResult = {
      provider: 'flourish',
      id: 'visualisation/29132382',
      src: value,
      url: 'https://public.flourish.studio/visualisation/29132382/',
    }

    expect(flourishResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a foreign host', () => {
    expect(flourishResolveEmbed('https://evil.test/visualisation/29132382/embed')).toBeUndefined()
  })

  it('should return undefined for a string that is not a url', () => {
    expect(flourishResolveEmbed('visualisation/29132382/embed')).toBeUndefined()
  })
})
