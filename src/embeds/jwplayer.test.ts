import { describe, expect, it } from 'bun:test'
import { describeForEachParser, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractJwplayerId,
  jwplayerAmpEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerResolveEmbed,
  jwplayerScriptEmbedResolver,
} from './jwplayer.js'

describe('extractJwplayerId', () => {
  it('should extract the media id from a player url', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-abc12345.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  it('should extract the media id when no player id is present', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  // Business Insider's feed ships JW Player embeds with an empty player id, leaving a
  // `{mediaId}-.html` tail whose URL 404s ("File not Found"). This is a quirk of that feed,
  // not something other providers hit — most embeds carry a well-formed URL. Extracting the
  // media id from the segment recovers it regardless of the missing player id.
  it('should extract the media id from a Business Insider empty-player-id url', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  it('should extract the media id from a jwplatform.com host', () => {
    const value = 'https://content.jwplatform.com/players/H4GXr873-abc12345.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  it('should return undefined for an invalid url', () => {
    const value = 'not a url'

    expect(extractJwplayerId(value)).toBeUndefined()
  })

  it('should return undefined when the media id is malformed', () => {
    const value = 'https://cdn.jwplayer.com/players/short.html'

    expect(extractJwplayerId(value)).toBeUndefined()
  })
})

describe('jwplayerResolveEmbed', () => {
  it('should build the embed with a thumbnail', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-abc12345.html'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(jwplayerResolveEmbed(value)).toEqual(expected)
  })

  // The rebuilt src drops the empty player-id segment that 404s in the Business Insider feed.
  it('should rebuild a working src from an empty-player-id url', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-.html'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(jwplayerResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined when no media id can be extracted', () => {
    const value = 'not a url'

    expect(jwplayerResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('jwplayerIframeEmbedResolver', (parseHtml) => {
  const resolve = resolverExtractor(parseHtml, jwplayerIframeEmbedResolver)

  it('should resolve a jwplayer iframe', async () => {
    const value = '<iframe src="https://cdn.jwplayer.com/players/H4GXr873-.html"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(await resolve(value)).toEqual(expected)
  })

  it('should ignore a non-jwplayer iframe', async () => {
    const value = '<iframe src="https://example.com/video"></iframe>'

    expect(await resolve(value)).toBeUndefined()
  })
})

describeForEachParser('jwplayerScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, jwplayerScriptEmbedResolver)

  it('should resolve the script embed to the default-player placeholder', async () => {
    const value =
      '<script type="application/javascript" src="https://cdn.jwplayer.com/players/H4GXr873-abc12345.js"></script>'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined for a foreign host carrying the player path', async () => {
    const value =
      '<script src="https://evil.test/jwplayer.com/players/H4GXr873-abc12345.js"></script>'

    expect(await extract(value)).toBeUndefined()
  })
})

describeForEachParser('jwplayerAmpEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, jwplayerAmpEmbedResolver)

  it('should resolve the AMP element to the default-player placeholder', async () => {
    const value =
      '<amp-jwplayer data-media-id="H4GXr873" data-player-id="abc12345" width="16" height="9"></amp-jwplayer>'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
      width: 16,
      height: 9,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined for a malformed media id', async () => {
    const value =
      '<amp-jwplayer data-media-id="../../evil" data-player-id="abc12345"></amp-jwplayer>'

    expect(await extract(value)).toBeUndefined()
  })

  // A playlist names no single media, so there is no poster and no player page to mint.
  it('should not claim the playlist variant', async () => {
    const value =
      '<amp-jwplayer data-playlist-id="482jsTAr" data-player-id="abc12345"></amp-jwplayer>'

    expect(await extract(value)).toBeUndefined()
  })
})
