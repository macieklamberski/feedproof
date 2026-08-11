import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { speakerdeckEmbedResolver, speakerdeckResolveEmbed } from './speakerdeck.js'

describeForEachParser('speakerdeckEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(speakerdeckEmbedResolver.selector)

    return element ? (speakerdeckEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should mint the player url from the deck id', () => {
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

      expect(extract(value)).toEqual(expected)
    })

    it('should convert a taller ratio into the placeholder dimensions', () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="198d4fae73df442e89b76766b54e4773"
          data-ratio="1.33333333333333"
          src="https://speakerdeck.com/assets/embed.js"
        ></script>
      `

      expect(extract(value)).toMatchObject({
        width: 100,
        height: 75,
      })
    })
  })

  describe('edge cases', () => {
    it('should fall back to the default ratio for a malformed one', () => {
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

      expect(extract(value)).toEqual(expected)
    })

    it('should fall back to the default ratio for a zero one', () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="198d4fae73df442e89b76766b54e4773"
          data-ratio="0"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `

      expect(extract(value)).toMatchObject({
        width: 100,
        height: 56,
      })
    })

    it('should give the default ratio to a script carrying none', () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="198d4fae73df442e89b76766b54e4773"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `

      expect(extract(value)).toMatchObject({
        width: 100,
        height: 56,
      })
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an id that is not 32 hex chars', () => {
      const value = html`
        <script
          class="speakerdeck-embed"
          data-id="../decks/evil"
          src="//speakerdeck.com/assets/embed.js"
        ></script>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty id', () => {
      const value = html`
        <script class="speakerdeck-embed" data-id="" src="//speakerdeck.com/assets/embed.js"></script>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should not match a script without the embed class', () => {
      const value = html`
        <script data-id="40746bbd65b944eb848e90ab1be552c0" src="//speakerdeck.com/assets/embed.js"></script>
      `

      expect(extract(value)).toBeUndefined()
    })
  })

  it('should replace the script with an embed placeholder end to end', async () => {
    const value = html`
      <p>Slides from the talk:</p>
      <script
        async
        class="speakerdeck-embed"
        data-id="40746bbd65b944eb848e90ab1be552c0"
        data-ratio="1.77777777777778"
        src="//speakerdeck.com/assets/embed.js"
      ></script>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    expect(result).toContain('data-embed-provider="speakerdeck"')
    expect(result).toContain(
      'data-embed-src="https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0"',
    )
    expect(result).not.toContain('<script')
  })
})

describe('speakerdeckResolveEmbed', () => {
  it('should resolve a player url', () => {
    const value = 'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0'

    expect(speakerdeckResolveEmbed(value)).toMatchObject({
      provider: 'speakerdeck',
      id: '40746bbd65b944eb848e90ab1be552c0',
      src: value,
    })
  })

  it('should give a size-less player the default deck ratio', () => {
    const result = speakerdeckResolveEmbed(
      'https://speakerdeck.com/player/40746bbd65b944eb848e90ab1be552c0',
    )

    expect(result?.width).toBeDefined()
    expect(result?.height).toBeDefined()
  })

  it('should ignore a deck page rather than a player', () => {
    expect(speakerdeckResolveEmbed('https://speakerdeck.com/user/some-deck')).toBeUndefined()
  })

  it('should ignore a player id that is not a 32-char hex', () => {
    expect(speakerdeckResolveEmbed('https://speakerdeck.com/player/not-a-deck')).toBeUndefined()
  })
})
