import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractSpreakerEmbed,
  spreakerAnchorEmbedResolver,
  spreakerResolveEmbed,
} from './spreaker.js'

describe('extractSpreakerEmbed', () => {
  it('should read an episode player', () => {
    const value = 'https://widget.spreaker.com/player?episode_id=52842990&theme=dark&playlist=false'
    const expected = {
      kind: 'episode',
      param: 'episode_id',
      id: '52842990',
    }

    expect(extractSpreakerEmbed(value)).toEqual(expected)
  })

  it('should read a show player', () => {
    const value = 'https://widget.spreaker.com/player?show_id=1234567'
    const expected = {
      kind: 'show',
      param: 'show_id',
      id: '1234567',
    }

    expect(extractSpreakerEmbed(value)).toEqual(expected)
  })

  it('should return undefined when the player names nothing', () => {
    const value = 'https://widget.spreaker.com/player?theme=dark'

    expect(extractSpreakerEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a spreaker url that is not a player', () => {
    const value = 'https://www.spreaker.com/show/some-show'

    expect(extractSpreakerEmbed(value)).toBeUndefined()
  })
})

describe('spreakerResolveEmbed', () => {
  // The corpus iframes carry no height at all, so stating Spreaker's documented 200 is what a
  // reader gains beyond the provider label.
  it('should state the documented player height', () => {
    const value = 'https://widget.spreaker.com/player?episode_id=52842990&theme=dark'
    const expected: EmbedResolverResult = {
      provider: 'spreaker',
      id: 'episode/52842990',
      src: 'https://widget.spreaker.com/player?episode_id=52842990',
      height: 200,
    }

    expect(spreakerResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a spreaker url naming no episode', () => {
    const value = 'https://widget.spreaker.com/player?x=1'

    expect(spreakerResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('spreakerAnchorEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(spreakerAnchorEmbedResolver.selector)

    return element
      ? (spreakerAnchorEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  // The corpus shape: the loader swaps this anchor for the player, so without it a reader sees
  // the fallback text and nothing else.
  const anchor = (attributes: string) =>
    html`<a class="spreaker-player" href="https://www.spreaker.com/episode/42" ${attributes}>Listen to "An episode" on Spreaker.</a>`

  describe('happy paths', () => {
    it('should read the episode out of data-resource', () => {
      const value = anchor('data-resource="episode_id=42"')
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        height: 200,
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should read a show resource', () => {
      const value = anchor('data-resource="show_id=99"')
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'show/99',
        src: 'https://widget.spreaker.com/player?show_id=99',
        height: 200,
      }

      expect(extract(value)).toEqual(expected)
    })

    // The publisher sized this one, so their height wins over the documented constant.
    it('should prefer the stated data-height', () => {
      const value = anchor('data-resource="episode_id=42" data-height="350px"')
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        height: 350,
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should accept a bare pixel count', () => {
      const value = anchor('data-resource="episode_id=42" data-height="120"')
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        height: 120,
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should keep the constant when data-height is not a pixel count', () => {
      const value = anchor('data-resource="episode_id=42" data-height="100%"')
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        height: 200,
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should return undefined when the resource names no id', () => {
      const value = anchor('data-resource="episode_id=abc"')

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an unknown resource kind', () => {
      const value = anchor('data-resource="playlist_id=42"')

      expect(extract(value)).toBeUndefined()
    })

    // The class is styling anyone can copy and the anchor already works as a link, so an
    // anchor without the attribute stays a link.
    it('should not match an anchor carrying the class alone', () => {
      const value = html`
      <a class="spreaker-player" href="https://www.spreaker.com/episode/42">Listen.</a>
    `

      expect(parseHtml(value).querySelector(spreakerAnchorEmbedResolver.selector)).toBeNull()
    })
  })
})

// The anchor is what a reader actually receives, so this asserts the whole placeholder the
// pipeline emits from it rather than the resolver's return value alone.
