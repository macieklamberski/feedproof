import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  audioboomPlayerEmbedResolver,
  audioboomResolveEmbed,
  extractAudioboomPost,
} from './audioboom.js'

describe('extractAudioboomPost', () => {
  it('should read the current player', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed/v4'
    const expected = { id: '8292430', isCurrent: true }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should read the compact player', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed'
    const expected = { id: '8292430', isCurrent: false }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should read the pre-rename boos spelling', () => {
    const value = 'https://audioboo.fm/boos/123456/embed'
    const expected = { id: '123456', isCurrent: false }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should drop the episode slug the share code hangs off the id', () => {
    const value =
      'https://embeds.audioboom.com/posts/6479208-eddie-jones-england-s-forward-power/embed/v4'
    const expected = { id: '6479208', isCurrent: true }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should drop the episode slug on the pre-rename boos spelling too', () => {
    const value = 'https://audioboo.fm/boos/2682680-joyous-jingles/embed'
    const expected = { id: '2682680', isCurrent: false }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should return undefined for a segment that starts with the slug', () => {
    const value = 'https://embeds.audioboom.com/posts/joyous-jingles/embed'

    expect(extractAudioboomPost(value)).toBeUndefined()
  })

  it('should return undefined for an audioboom url naming no post', () => {
    const value = 'https://audioboom.com/channels/something'

    expect(extractAudioboomPost(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractAudioboomPost(value)).toBeUndefined()
  })
})

describe('audioboomResolveEmbed', () => {
  // The url names the player version and the version decides the height.
  it('should size the current player at its own height', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed/v4'
    const expected: EmbedResolverResult = {
      provider: 'audioboom',
      id: '8292430',
      src: 'https://embeds.audioboom.com/posts/8292430/embed/v4',
      height: 300,
    }

    expect(audioboomResolveEmbed(value)).toEqual(expected)
  })

  it('should size the compact player shorter', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed'
    const expected: EmbedResolverResult = {
      provider: 'audioboom',
      id: '8292430',
      src: 'https://embeds.audioboom.com/posts/8292430/embed',
      height: 95,
    }

    expect(audioboomResolveEmbed(value)).toEqual(expected)
  })

  it('should mint the bare id from a slugged url', () => {
    const value =
      'https://embeds.audioboom.com/posts/6479208-eddie-jones-england-s-forward-power/embed/v4'
    const expected: EmbedResolverResult = {
      provider: 'audioboom',
      id: '6479208',
      src: 'https://embeds.audioboom.com/posts/6479208/embed/v4',
      height: 300,
    }

    expect(audioboomResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a audioboom url naming no post', () => {
    const value = 'https://audioboom.com/about'

    expect(audioboomResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('audioboomPlayerEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, audioboomPlayerEmbedResolver)

  describe('happy paths', () => {
    it('should read the player url the plugin parks on its own div', async () => {
      const value = html`
        <div
          class="ab-player"
          data-boourl="https://audioboo.fm/boos/2158735-rty-at-ictedu-conference/embed/v2?eid=AQAAAKtDe1OP8CAA"
        >
          <a href="https://audioboo.fm/boos/2158735-rty-at-ictedu-conference">listen on Audioboo</a>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'audioboom',
        id: '2158735',
        src: 'https://embeds.audioboom.com/posts/2158735/embed',
        height: 95,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a protocol-relative player url', async () => {
      const value = html`
        <div
          class="ab-player"
          data-boourl="//embeds.audioboom.com/posts/8292430/embed/v4"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'audioboom',
        id: '8292430',
        src: 'https://embeds.audioboom.com/posts/8292430/embed/v4',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host parked in the same attribute', async () => {
      const value = html`
        <div
          class="ab-player"
          data-boourl="https://evil.test/audioboo.fm/boos/2158735/embed"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a div whose attribute names no post', async () => {
      const value =
        '<div class="ab-player" data-boourl="https://audioboom.com/channels/news"></div>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('audioboom through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim a slugged player url framed as an embed', async () => {
    const value = html`
      <iframe
        src="https://embeds.audioboom.com/posts/6479208-eddie-jones-england-s-forward-power/embed/v4"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-id="6479208"
        data-embed-provider="audioboom"
        data-embed-src="https://embeds.audioboom.com/posts/6479208/embed/v4"
        data-embed-height="300"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // The episode audio sits on the same host and under the same path as the player, and differs
  // only by its extension, so the enclosure probe offers it to this resolver on every feed.
  it('should leave an audioboom audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://audioboom.com/posts/8292430-the-tv-listings-guides-of-christmas-past.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://audioboom.com/posts/8292430-the-tv-listings-guides-of-christmas-past.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
