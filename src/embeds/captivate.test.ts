import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { captivateResolveEmbed, extractCaptivateEmbed } from './captivate.js'

const uuid = '7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

describe('extractCaptivateEmbed', () => {
  it('should read an episode player', () => {
    const value = `https://player.captivate.fm/episode/${uuid}/`
    const expected = { kind: 'episode', id: uuid }

    expect(extractCaptivateEmbed(value)).toEqual(expected)
  })

  it('should read a show player', () => {
    const value = `https://player.captivate.fm/show/${uuid}`
    const expected = { kind: 'show', id: uuid }

    expect(extractCaptivateEmbed(value)).toEqual(expected)
  })

  // Nothing downstream reads which kind it is, so a kind Captivate adds later reaches the same
  // player instead of falling through to a carrier that has lost its height.
  it('should read a kind the platform has not published yet', () => {
    const value = `https://player.captivate.fm/clip/${uuid}`
    const expected = { kind: 'clip', id: uuid }

    expect(extractCaptivateEmbed(value)).toEqual(expected)
  })

  it('should return undefined for an id that is not a uuid', () => {
    const value = 'https://player.captivate.fm/episode/12345'

    expect(extractCaptivateEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a captivate url that is not a player', () => {
    const value = 'https://captivate.fm/pricing'

    expect(extractCaptivateEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a first segment that is not a route word', () => {
    const value = `https://player.captivate.fm/2024/${uuid}`

    expect(extractCaptivateEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractCaptivateEmbed(value)).toBeUndefined()
  })
})

describe('captivateResolveEmbed', () => {
  it('should state the fixed player height', () => {
    const value = `https://player.captivate.fm/episode/${uuid}/`
    const expected: EmbedResolverResult = {
      provider: 'captivate',
      id: `episode/${uuid}`,
      src: `https://player.captivate.fm/episode/${uuid}`,
      height: 200,
    }

    expect(captivateResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a captivate url naming no episode', () => {
    const value = 'https://player.captivate.fm/about'

    expect(captivateResolveEmbed(value)).toBeUndefined()
  })
})

// The url resolver reaches every enclosure a feed carries, and Captivate's episode files sit on
// the same domain as its player one segment deeper, so only the segment count keeps them playable.
describeForEachParser('captivate through the pipeline', (parseHtml) => {
  it('should leave a captivate audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://podcasts.captivate.fm/media/1d2e3f40-aaaa-bbbb-cccc-1234567890ab/episode.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://podcasts.captivate.fm/media/1d2e3f40-aaaa-bbbb-cccc-1234567890ab/episode.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(
      await transformContent('<p>Body</p>', {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
        enclosures,
      }),
    ).toEqualHtml(expected)
  })
})
