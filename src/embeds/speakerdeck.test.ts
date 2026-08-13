import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { speakerdeckResolveEmbed, speakerdeckScriptEmbedResolver } from './speakerdeck.js'

describeForEachParser('speakerdeckScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, speakerdeckScriptEmbedResolver)

  // Measured 2026-08-11: 36 corpus feeds carry a 24-char Mongo ObjectId from 2011-2012 and
  // every sampled one still plays. The old 32-char-only rule dropped all of them.
  describe('legacy ids and slides', () => {
    it('should accept a legacy 24-char deck id', async () => {
      const value =
        '<script class="speakerdeck-embed" data-id="4f2b3c1d5e6a7b8c9d0e1f2a" src="//speakerdeck.com/assets/embed.js"></script>'
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '4f2b3c1d5e6a7b8c9d0e1f2a',
        src: 'https://speakerdeck.com/player/4f2b3c1d5e6a7b8c9d0e1f2a',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A feed can embed one deck at many slides; without this they collapse into identical
    // placeholders.
    it('should carry data-slide into the player url', async () => {
      const value =
        '<script class="speakerdeck-embed" data-id="40746bbd65b944eb848e90ab1be552c0" data-slide="21" src="//speakerdeck.com/assets/embed.js"></script>'
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '40746bbd65b944eb848e90ab1be552c0/21',
        src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=21',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a slide written inside the id attribute', async () => {
      const value =
        '<script class="speakerdeck-embed" data-id="40746bbd65b944eb848e90ab1be552c0?slide=69" src="//speakerdeck.com/assets/embed.js"></script>'
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '40746bbd65b944eb848e90ab1be552c0/69',
        src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=69',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a non-numeric slide', async () => {
      const value =
        '<script class="speakerdeck-embed" data-id="40746bbd65b944eb848e90ab1be552c0" data-slide="last" src="//speakerdeck.com/assets/embed.js"></script>'
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '40746bbd65b944eb848e90ab1be552c0',
        src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('happy paths', () => {
    it('should mint the player url from the deck id', async () => {
      const value = html`
        <script
          async
          class="speakerdeck-embed"
          data-id="40746bbd65b944eb848e90ab1be552c0"
          data-ratio="1.77777777777778"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '40746bbd65b944eb848e90ab1be552c0',
        src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should convert a taller ratio into the placeholder dimensions', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="198d4fae73df442e89b76766b54e4773"
          data-ratio="1.33333333333333"
          src="https://speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '198d4fae73df442e89b76766b54e4773',
        src: 'https://speakerdeck.com/player/198d4fae73df442e89b76766b54e4773',
        width: 100,
        height: 75,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should fall back to the default ratio for a malformed one', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="198d4fae73df442e89b76766b54e4773"
          data-ratio="wide"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '198d4fae73df442e89b76766b54e4773',
        src: 'https://speakerdeck.com/player/198d4fae73df442e89b76766b54e4773',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the default ratio for a zero one', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="198d4fae73df442e89b76766b54e4773"
          data-ratio="0"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '198d4fae73df442e89b76766b54e4773',
        src: 'https://speakerdeck.com/player/198d4fae73df442e89b76766b54e4773',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should give the default ratio to a script carrying none', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="198d4fae73df442e89b76766b54e4773"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '198d4fae73df442e89b76766b54e4773',
        src: 'https://speakerdeck.com/player/198d4fae73df442e89b76766b54e4773',
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an id that is not 32 hex chars', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="../decks/evil"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty id', async () => {
      const value = html`
        <script class="speakerdeck-embed" data-id="" src="//speakerdeck.com/assets/embed.js"></script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a script without the embed class', async () => {
      const value = html`
        <script data-id="40746bbd65b944eb848e90ab1be552c0" src="//speakerdeck.com/assets/embed.js"></script>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('speakerdeckResolveEmbed', () => {
  it('should resolve a player url', () => {
    const value = 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0'
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: value,
      width: 100,
      height: 56,
    }

    expect(speakerdeckResolveEmbed(value)).toEqual(expected)
  })

  it('should give a size-less player the default deck ratio', () => {
    const value = 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0'
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
      width: 100,
      height: 56,
    }

    expect(speakerdeckResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore a deck page rather than a player', () => {
    const value = 'https://speakerdeck.com/user/some-deck'

    expect(speakerdeckResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore a player id that is not a 32-char hex', () => {
    const value = 'https://speakerdeck.com/player/not-a-deck'

    expect(speakerdeckResolveEmbed(value)).toBeUndefined()
  })
})
