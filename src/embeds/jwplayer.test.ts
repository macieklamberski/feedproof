import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import { extractJwplayerId, jwplayerEmbedResolver, jwplayerResolveEmbed } from './jwplayer.js'

describe('extractJwplayerId', () => {
  it('should extract the media id from a player url', () => {
    expect(extractJwplayerId('https://cdn.jwplayer.com/players/H4GXr873-abc12345.html')).toBe(
      'H4GXr873',
    )
  })

  it('should extract the media id when no player id is present', () => {
    expect(extractJwplayerId('https://cdn.jwplayer.com/players/H4GXr873.html')).toBe('H4GXr873')
  })

  // Business Insider's feed ships JW Player embeds with an empty player id, leaving a
  // `{mediaId}-.html` tail whose URL 404s ("File not Found"). This is a quirk of that feed,
  // not something other providers hit — most embeds carry a well-formed URL. Extracting the
  // media id from the segment recovers it regardless of the missing player id.
  it('should extract the media id from a Business Insider empty-player-id url', () => {
    expect(extractJwplayerId('https://cdn.jwplayer.com/players/H4GXr873-.html')).toBe('H4GXr873')
  })

  it('should extract the media id from a jwplatform.com host', () => {
    expect(extractJwplayerId('https://content.jwplatform.com/players/H4GXr873-abc12345.html')).toBe(
      'H4GXr873',
    )
  })

  it('should return undefined for an invalid url', () => {
    expect(extractJwplayerId('not a url')).toBeUndefined()
  })

  it('should return undefined when the media id is malformed', () => {
    expect(extractJwplayerId('https://cdn.jwplayer.com/players/short.html')).toBeUndefined()
  })
})

describe('jwplayerResolveEmbed', () => {
  it('should build the embed with a thumbnail', () => {
    const result = jwplayerResolveEmbed('https://cdn.jwplayer.com/players/H4GXr873-abc12345.html')
    const expected = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(result).toEqual(expected)
  })

  // The rebuilt src drops the empty player-id segment that 404s in the Business Insider feed.
  it('should rebuild a working src from an empty-player-id url', () => {
    const result = jwplayerResolveEmbed('https://cdn.jwplayer.com/players/H4GXr873-.html')

    expect(result?.src).toBe('https://cdn.jwplayer.com/players/H4GXr873.html')
  })

  it('should return undefined when no media id can be extracted', () => {
    expect(jwplayerResolveEmbed('not a url')).toBeUndefined()
  })
})

describeForEachParser('jwplayerEmbedResolver', (parseHtml) => {
  const resolve = (value: string) => {
    const element = parseHtml(value).querySelector(jwplayerEmbedResolver.selector) ?? undefined
    return element ? jwplayerEmbedResolver.extract(element) : undefined
  }

  it('should resolve a jwplayer iframe', async () => {
    const result = await resolve(
      '<iframe src="https://cdn.jwplayer.com/players/H4GXr873-.html"></iframe>',
    )

    expect(result?.provider).toBe('jwplayer')
    expect(result?.id).toBe('H4GXr873')
  })

  it('should ignore a non-jwplayer iframe', async () => {
    const result = await resolve('<iframe src="https://example.com/video"></iframe>')

    expect(result).toBeUndefined()
  })
})
