import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
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

    expect(extractSpreakerEmbed(value)).toEqual({
      kind: 'episode',
      param: 'episode_id',
      id: '52842990',
    })
  })

  it('should read a show player', () => {
    expect(extractSpreakerEmbed('https://widget.spreaker.com/player?show_id=1234567')).toEqual({
      kind: 'show',
      param: 'show_id',
      id: '1234567',
    })
  })

  it('should return undefined when the player names nothing', () => {
    expect(extractSpreakerEmbed('https://widget.spreaker.com/player?theme=dark')).toBeUndefined()
  })

  it('should return undefined for a spreaker url that is not a player', () => {
    expect(extractSpreakerEmbed('https://www.spreaker.com/show/some-show')).toBeUndefined()
  })
})

describe('spreakerResolveEmbed', () => {
  // The corpus iframes carry no height at all, so stating Spreaker's documented 200 is what a
  // reader gains beyond the provider label.
  it('should state the documented player height', () => {
    const value = 'https://widget.spreaker.com/player?episode_id=52842990&theme=dark'

    expect(spreakerResolveEmbed(value)).toEqual({
      provider: 'spreaker',
      id: 'episode/52842990',
      src: 'https://widget.spreaker.com/player?episode_id=52842990',
      height: 200,
    })
  })

  it('should return undefined for a spreaker url naming no episode', () => {
    expect(spreakerResolveEmbed('https://widget.spreaker.com/player?x=1')).toBeUndefined()
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
      expect(extract(anchor('data-resource="episode_id=42"'))).toEqual({
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        height: 200,
      })
    })

    it('should read a show resource', () => {
      expect(extract(anchor('data-resource="show_id=99"'))).toMatchObject({ id: 'show/99' })
    })

    // The publisher sized this one, so their height wins over the documented constant.
    it('should prefer the stated data-height', () => {
      expect(extract(anchor('data-resource="episode_id=42" data-height="350px"'))).toMatchObject({
        height: 350,
      })
    })

    it('should accept a bare pixel count', () => {
      expect(extract(anchor('data-resource="episode_id=42" data-height="120"'))).toMatchObject({
        height: 120,
      })
    })
  })

  describe('sad paths', () => {
    it('should keep the constant when data-height is not a pixel count', () => {
      expect(extract(anchor('data-resource="episode_id=42" data-height="100%"'))).toMatchObject({
        height: 200,
      })
    })

    it('should return undefined when the resource names no id', () => {
      expect(extract(anchor('data-resource="episode_id=abc"'))).toBeUndefined()
    })

    it('should return undefined for an unknown resource kind', () => {
      expect(extract(anchor('data-resource="playlist_id=42"'))).toBeUndefined()
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
describeForEachParser('spreaker anchor through the pipeline', (parseHtml) => {
  const readPlaceholder = (result: string): Record<string, string> => {
    const element = parseHtml(result).querySelector('[data-embed-src]')
    const fields: Record<string, string> = {}

    for (const name of element?.getAttributeNames() ?? []) {
      const value = element?.getAttribute(name)

      if (name.startsWith('data-embed-') && value) {
        fields[name.replace('data-embed-', '')] = value
      }
    }

    return fields
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    return readPlaceholder(result)
  }

  it('should carry every field across', async () => {
    const value = html`
      <a
        class="spreaker-player"
        href="https://www.spreaker.com/episode/42"
        data-resource="episode_id=42"
        data-height="350px"
      >Listen to "An episode" on Spreaker.</a>
    `

    expect(await placeholder(value)).toEqual({
      provider: 'spreaker',
      id: 'episode/42',
      src: 'https://widget.spreaker.com/player?episode_id=42',
      height: '350',
    })
  })

  // Without the resolver this stays an ordinary link, which is what a reader sees today.
  it('should leave an anchor naming no resource as a link', async () => {
    const value = html`<a class="spreaker-player" href="https://www.spreaker.com/episode/42">Listen.</a>`

    expect(await placeholder(value)).toEqual({})
  })
})
