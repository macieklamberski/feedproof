import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractNicovideoId,
  nicovideoResolveEmbed,
  nicovideoScriptEmbedResolver,
} from './nicovideo.js'

describe('extractNicovideoId', () => {
  it('should read the video id from the thumb_watch path', () => {
    expect(extractNicovideoId('https://ext.nicovideo.jp/thumb_watch/sm9?w=490&h=307')).toBe('sm9')
  })

  it('should read the other id prefixes', () => {
    expect(extractNicovideoId('https://ext.nicovideo.jp/thumb_watch/nm12345')).toBe('nm12345')
    expect(extractNicovideoId('https://ext.nicovideo.jp/thumb_watch/so67890')).toBe('so67890')
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractNicovideoId('https://[')).toBeUndefined()
  })

  it('should return undefined for a nicovideo url naming no video', () => {
    expect(extractNicovideoId('https://ext.nicovideo.jp/thumb_watch/')).toBeUndefined()
  })

  it('should return undefined for an id that is not the documented shape', () => {
    expect(extractNicovideoId('https://ext.nicovideo.jp/thumb_watch/../etc')).toBeUndefined()
  })
})

describeForEachParser('nicovideoScriptEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(nicovideoScriptEmbedResolver.selector)

    return element
      ? (nicovideoScriptEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('happy paths', () => {
    it('should mint the modern player and carry both dimensions as a ratio', () => {
      const value = html`<script src="https://ext.nicovideo.jp/thumb_watch/sm9?w=490&amp;h=307"></script>`

      expect(extract(value)).toEqual({
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
        width: 490,
        height: 307,
      })
    })

    // The current spelling of the same loader.
    it('should read the modern script form', () => {
      const value = html`<script src="https://embed.nicovideo.jp/watch/sm9/script"></script>`

      expect(extract(value)).toMatchObject({ src: 'https://embed.nicovideo.jp/watch/sm9' })
    })

    it('should state no size when the script asks for none', () => {
      const value = html`<script src="https://ext.nicovideo.jp/thumb_watch/sm9"></script>`

      expect(extract(value)).toEqual({
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
      })
    })

    // One dimension alone would be read as a fixed height rather than a ratio, so both or
    // neither.
    it('should state no size when only one dimension is given', () => {
      const value = html`<script src="https://ext.nicovideo.jp/thumb_watch/sm9?h=307"></script>`

      expect(extract(value)).not.toHaveProperty('height')
    })

    it('should read a protocol-relative src', () => {
      const value = html`<script src="//ext.nicovideo.jp/thumb_watch/sm9"></script>`

      expect(extract(value)).toMatchObject({ id: 'sm9' })
    })
  })

  describe('sad paths', () => {
    it('should state no size when a dimension is not a pixel count', () => {
      const value = html`<script src="https://ext.nicovideo.jp/thumb_watch/sm9?w=100%25&amp;h=307"></script>`

      expect(extract(value)).not.toHaveProperty('height')
    })

    it('should return undefined for a nicovideo script naming no video', () => {
      const value = html`<script src="https://ext.nicovideo.jp/thumb_watch/"></script>`

      expect(extract(value)).toBeUndefined()
    })
  })
})

// The script is what a reader actually receives, so this asserts the whole placeholder the
// pipeline emits from it rather than the resolver's return value alone.
describe('nicovideoResolveEmbed', () => {
  // The old card host answers 403 now, so this rewrite repairs an embed that renders nothing.
  it('should rewrite the dead thumb card to the modern player', () => {
    expect(nicovideoResolveEmbed('https://ext.nicovideo.jp/thumb/sm9')).toEqual({
      provider: 'nicovideo',
      id: 'sm9',
      src: 'https://embed.nicovideo.jp/watch/sm9',
      url: 'https://www.nicovideo.jp/watch/sm9',
    })
  })

  it('should leave a modern player url as it stands', () => {
    expect(nicovideoResolveEmbed('https://embed.nicovideo.jp/watch/sm9')).toMatchObject({
      src: 'https://embed.nicovideo.jp/watch/sm9',
    })
  })

  it('should return undefined for a nicovideo url naming no video', () => {
    expect(nicovideoResolveEmbed('https://www.nicovideo.jp/ranking')).toBeUndefined()
  })
})
