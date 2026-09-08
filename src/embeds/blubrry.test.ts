import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { blubrryEmbedResolver, blubrryResolveEmbed, extractBlubrryEmbed } from './blubrry.js'

describe('extractBlubrryEmbed', () => {
  it('should read an episode id', () => {
    const value = 'https://player.blubrry.com/id/12345678/'
    const expected = '12345678'

    expect(extractBlubrryEmbed(value)).toBe(expected)
  })

  it('should read a media url', () => {
    const value =
      'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3'
    const expected = 'https://media.blubrry.com/show/ep.mp3'

    expect(extractBlubrryEmbed(value)).toBe(expected)
  })

  it('should return undefined for a blubrry url naming nothing', () => {
    const value = 'https://blubrry.com/pricing'

    expect(extractBlubrryEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractBlubrryEmbed(value)).toBeUndefined()
  })
})

describe('blubrryResolveEmbed', () => {
  it('should state the player height for an episode id', () => {
    const value = 'https://player.blubrry.com/id/12345678/'
    const expected: EmbedResolverResult = {
      provider: 'blubrry',
      id: '12345678',
      src: 'https://player.blubrry.com/id/12345678/',
      height: 164,
    }

    expect(blubrryResolveEmbed(value)).toEqual(expected)
  })

  // The raw file stays inside the player url: form fidelity keeps a provider's player an embed.
  it('should keep a media url as a player rather than a native audio element', () => {
    const value =
      'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3'
    const expected: EmbedResolverResult = {
      provider: 'blubrry',
      id: 'https://media.blubrry.com/show/ep.mp3',
      src: 'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3',
      height: 164,
    }

    expect(blubrryResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a blubrry url naming no episode', () => {
    const value = 'https://blubrry.com/about'

    expect(blubrryResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('blubrryEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, blubrryEmbedResolver)

  describe('happy paths', () => {
    it('should claim a player iframe and state the measured height', async () => {
      const value = html`
        <iframe
          src="https://player.blubrry.com/id/153989314/"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'blubrry',
        id: '153989314',
        src: 'https://player.blubrry.com/id/153989314/',
        height: 164,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // `blubrry.com` admits every subdomain, including the two media hosts, so the gate has to
    // refuse a lookalike suffixing the whole domain. The path here is a real player path.
    it('should ignore a lookalike host suffixing the player domain', async () => {
      const value = '<iframe src="https://player.blubrry.com.evil.test/id/153989314/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the size a publisher states', () => {
    // 13,001 of 13,604 corpus iframes state 165, one more than the player measures, and that
    // publisher's number is the one a reader gets: the measured 164 only reaches the carrier
    // that states nothing.
    it('should let the carrier height win over the measured one', async () => {
      const value = html`
        <iframe
          src="https://player.blubrry.com/id/153989314/"
          width="100%"
          height="165"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'blubrry',
        id: '153989314',
        src: 'https://player.blubrry.com/id/153989314/',
        height: 165,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The resolver only reaches a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('blubrry through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim a player url framed as an embed', async () => {
    const value = '<iframe src="https://player.blubrry.com/id/153989314/"></iframe>'

    const expected = html`
      <div
        data-embed-id="153989314"
        data-embed-provider="blubrry"
        data-embed-src="https://player.blubrry.com/id/153989314/"
        data-embed-height="164"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // `media.blubrry.com` is Blubrry's download-tracking prefix and carries the real file url in
  // its own path. The host list admits it, so only the `/id/` route check keeps it playable.
  it('should leave a media.blubrry.com audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://media.blubrry.com/theshow/cdn.example.com/media/episode-500.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://media.blubrry.com/theshow/cdn.example.com/media/episode-500.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })

  // The other media host, where Blubrry hosts the file itself rather than redirecting to it.
  it('should leave a content.blubrry.com audio enclosure playable', async () => {
    const enclosures = [
      { url: 'https://content.blubrry.com/theshow/ep-42.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://content.blubrry.com/theshow/ep-42.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
