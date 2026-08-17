import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractNicovideoId,
  nicovideoResolveEmbed,
  nicovideoScriptEmbedResolver,
} from './nicovideo.js'

// Every `data-embed-*` field the placeholder carries, so a test can assert the whole set
// rather than the one field it happens to care about.
const readPlaceholder = (
  result: string,
  parseHtml: (value: string) => Document,
): Record<string, string> => {
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

describe('extractNicovideoId', () => {
  it('should read the video id from the thumb_watch path', () => {
    const value = 'https://ext.nicovideo.jp/thumb_watch/sm9?w=490&h=307'
    const expected = 'sm9'

    expect(extractNicovideoId(value)).toBe(expected)
  })

  it('should read the other id prefixes', () => {
    expect(extractNicovideoId('https://ext.nicovideo.jp/thumb_watch/nm12345')).toBe('nm12345')
    expect(extractNicovideoId('https://ext.nicovideo.jp/thumb_watch/so67890')).toBe('so67890')
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractNicovideoId(value)).toBeUndefined()
  })

  it('should return undefined for a nicovideo url naming no video', () => {
    const value = 'https://ext.nicovideo.jp/thumb_watch/'

    expect(extractNicovideoId(value)).toBeUndefined()
  })

  it('should return undefined for an id that is not the documented shape', () => {
    const value = 'https://ext.nicovideo.jp/thumb_watch/../etc'

    expect(extractNicovideoId(value)).toBeUndefined()
  })
})

describeForEachParser('nicovideoScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, nicovideoScriptEmbedResolver)

  describe('happy paths', () => {
    it('should mint the modern player and carry both dimensions as a ratio', async () => {
      const value = html`
        <script src="https://ext.nicovideo.jp/thumb_watch/sm9?w=490&amp;h=307"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
        width: 490,
        height: 307,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The current spelling of the same loader.
    it('should read the modern script form', async () => {
      const value = '<script src="https://embed.nicovideo.jp/watch/sm9/script"></script>'
      const expected: EmbedResolverResult = {
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no size when the script asks for none', async () => {
      const value = '<script src="https://ext.nicovideo.jp/thumb_watch/sm9"></script>'
      const expected: EmbedResolverResult = {
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A lone height reads as the fixed box this player is not, so it is both or neither.
    it('should state no size when only one dimension is given', async () => {
      const value = '<script src="https://ext.nicovideo.jp/thumb_watch/sm9?h=307"></script>'
      const expected: EmbedResolverResult = {
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a protocol-relative src', async () => {
      const value = '<script src="//ext.nicovideo.jp/thumb_watch/sm9"></script>'
      const expected: EmbedResolverResult = {
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should state no size when a dimension is not a pixel count', async () => {
      const value = html`
        <script src="https://ext.nicovideo.jp/thumb_watch/sm9?w=100%25&amp;h=307"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'nicovideo',
        id: 'sm9',
        src: 'https://embed.nicovideo.jp/watch/sm9',
        url: 'https://www.nicovideo.jp/watch/sm9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should return undefined for a nicovideo script naming no video', async () => {
      const value = '<script src="https://ext.nicovideo.jp/thumb_watch/"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    // The selector matches on a substring, so another host can carry the path and pass it.
    it('should return undefined for another host spelling the nicovideo path', async () => {
      const value = '<script src="https://evil.test/nicovideo.jp/thumb_watch/sm9"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The script is what a reader actually receives, so this asserts the whole placeholder the
// pipeline emits from it rather than the resolver's return value alone.
describe('nicovideoResolveEmbed', () => {
  // The old card host answers 403 now, so this rewrite repairs an embed that renders nothing.
  it('should rewrite the dead thumb card to the modern player', () => {
    const value = 'https://ext.nicovideo.jp/thumb/sm9'
    const expected: EmbedResolverResult = {
      provider: 'nicovideo',
      id: 'sm9',
      src: 'https://embed.nicovideo.jp/watch/sm9',
      url: 'https://www.nicovideo.jp/watch/sm9',
    }

    expect(nicovideoResolveEmbed(value)).toEqual(expected)
  })

  it('should leave a modern player url as it stands', () => {
    const value = 'https://embed.nicovideo.jp/watch/sm9'
    const expected: EmbedResolverResult = {
      provider: 'nicovideo',
      id: 'sm9',
      src: 'https://embed.nicovideo.jp/watch/sm9',
      url: 'https://www.nicovideo.jp/watch/sm9',
    }

    expect(nicovideoResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a nicovideo url naming no video', () => {
    const value = 'https://www.nicovideo.jp/ranking'

    expect(nicovideoResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('nicovideo through the pipeline', (parseHtml) => {
  const placeholder = async (value: string): Promise<Record<string, string>> => {
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    return readPlaceholder(result, parseHtml)
  }

  it('should carry every field across', async () => {
    const value = '<script src="https://ext.nicovideo.jp/thumb_watch/sm9?w=490&amp;h=307"></script>'
    const expected: Record<string, string> = {
      provider: 'nicovideo',
      id: 'sm9',
      src: 'https://embed.nicovideo.jp/watch/sm9',
      url: 'https://www.nicovideo.jp/watch/sm9',
      width: '490',
      height: '307',
    }

    expect(await placeholder(value)).toEqual(expected)
  })

  // A script alone is deleted as empty markup, so without the resolver the video vanishes.
  it('should leave nothing behind when the script names no video', async () => {
    const value = '<script src="https://ext.nicovideo.jp/thumb_watch/"></script>'
    const expected: Record<string, string> = {}

    expect(await placeholder(value)).toEqual(expected)
  })
})
