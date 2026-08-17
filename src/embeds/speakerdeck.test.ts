import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  speakerdeckIframeEmbedResolver,
  speakerdeckResolveEmbed,
  speakerdeckScriptEmbedResolver,
} from './speakerdeck.js'

describeForEachParser('speakerdeckScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, speakerdeckScriptEmbedResolver)

  // Measured 2026-08-11: 36 corpus feeds carry a 24-char Mongo ObjectId from 2011-2012 and
  // every sampled one still plays. The old 32-char-only rule dropped all of them.
  describe('legacy ids and slides', () => {
    it('should accept a legacy 24-char deck id', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="4f2b3c1d5e6a7b8c9d0e1f2a"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '4f2b3c1d5e6a7b8c9d0e1f2a',
        src: 'https://speakerdeck.com/player/4f2b3c1d5e6a7b8c9d0e1f2a',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A feed can embed one deck at many slides; without this they collapse into identical
    // placeholders.
    it('should carry data-slide into the player url', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="40746bbd65b944eb848e90ab1be552c0"
          data-slide="21"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '40746bbd65b944eb848e90ab1be552c0/21',
        src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=21',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a slide written inside the id attribute', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="40746bbd65b944eb848e90ab1be552c0?slide=69"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '40746bbd65b944eb848e90ab1be552c0/69',
        src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=69',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a non-numeric slide', async () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="40746bbd65b944eb848e90ab1be552c0"
          data-slide="last"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'speakerdeck',
        id: '40746bbd65b944eb848e90ab1be552c0',
        src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
        ratio: '16/9',
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
        ratio: '1.77777777777778/1',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry a taller ratio the script states', async () => {
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
        ratio: '1.33333333333333/1',
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
        ratio: '16/9',
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
        ratio: '16/9',
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
        ratio: '16/9',
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
  it('should give a size-less player the default deck ratio', () => {
    const value = 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0'
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
      ratio: '16/9',
    }

    expect(speakerdeckResolveEmbed(value)).toEqual(expected)
  })

  // The script form has always kept the slide, so the same deck at two slides collapsed into
  // one placeholder when it arrived as an iframe instead.
  it('should carry the slide the player url states', () => {
    const value = 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=21'
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0/21',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=21',
      ratio: '16/9',
    }

    expect(speakerdeckResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore a slide that is not a number', () => {
    const value = 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=last'
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
      ratio: '16/9',
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

describeForEachParser('speakerdeckIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, speakerdeckIframeEmbedResolver)

  // The player carrier states no ratio of its own, so a size-less one takes the deck default.
  it('should give a size-less player the default deck ratio', async () => {
    const value = html`
      <iframe src="https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  // The script form has always kept the slide, so the same deck at two slides collapsed into
  // one placeholder when it arrived as an iframe instead.
  it('should carry the slide the player url states', async () => {
    const value = html`
      <iframe src="https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=21"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0/21',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=21',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a slide that is not a number', async () => {
    const value = html`
      <iframe src="https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0?slide=last"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a deck page rather than a player', async () => {
    const value = '<iframe src="https://speakerdeck.com/user/some-deck"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  it('should ignore a player id that is not hex', async () => {
    const value = '<iframe src="https://speakerdeck.com/player/not-a-deck"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  it('should carry the deck title the carrier states', async () => {
    const value = html`
      <iframe
        src="https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0"
        title="Designing for the unexpected"
        width="710"
        height="399"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
      title: 'Designing for the unexpected',
      width: 710,
      height: 399,
    }

    expect(await extract(value)).toEqual(expected)
  })

  // The snippet writes the four-character string rather than omitting the attribute.
  it('should treat a literal null title as absent', async () => {
    const value = html`
      <iframe
        src="https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0"
        title="null"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })
})
