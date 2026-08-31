import { describe, expect, it } from 'bun:test'
import { describeForEachParser, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  dailymotionEmbedResolver,
  dailymotionResolveEmbed,
  extractDailymotionId,
} from './dailymotion.js'

// Every url spelling that names a single video. All extract the same id, so a deleted row is a
// format that silently lost support.
const videoUrls = [
  'https://www.dailymotion.com/video/x7tgad0',
  'https://dai.ly/x7tgad0',
  'https://www.dailymotion.com/embed/video/x7tgad0',
  // Both forms the Flash player shipped.
  'http://www.dailymotion.com/swf/x7tgad0',
  'http://www.dailymotion.com/swf/video/x7tgad0',
  // The Flash player took its parameters with `&` and no `?`, so they land in the path segment.
  'http://www.dailymotion.com/swf/x7tgad0&colors=background:000000;glow:000000',
  'http://www.dailymotion.com/swf/video/x7tgad0&colors=background:000000',
  'https://geo.dailymotion.com/player.html?video=x7tgad0',
  // Share urls append a title slug to the id.
  'https://www.dailymotion.com/video/x7tgad0_some-title',
]

// Every spelling that names a playlist rather than one video. None may yield a video id, and all
// resolve to the playlist player.
const playlistUrls = [
  'https://www.dailymotion.com/embed/playlist/x6zqmk',
  'https://www.dailymotion.com/playlist/x6zqmk',
  'https://geo.dailymotion.com/player.html?playlist=x6zqmk',
]

describe('extractDailymotionId', () => {
  it.each(videoUrls)('should extract the id from %s', (value) => {
    expect(extractDailymotionId(value)).toBe('x7tgad0')
  })

  it.each(playlistUrls)('should extract no video id from %s', (value) => {
    expect(extractDailymotionId(value)).toBeUndefined()
  })

  // The geo player states the video in its query, and a publisher who kept the path prefix
  // leaves a route word with nothing after it, so the query still has to be read.
  it('should read the query id when the path names no video', () => {
    const value = 'https://www.dailymotion.com/video/?video=x7tgad0'

    expect(extractDailymotionId(value)).toBe('x7tgad0')
  })

  it('should return undefined for an invalid url', () => {
    const value = 'not a url'

    expect(extractDailymotionId(value)).toBeUndefined()
  })
})

describe('dailymotionResolveEmbed', () => {
  it('should build the embed with a thumbnail', () => {
    const value = 'https://www.dailymotion.com/video/x7tgad0'
    const expected: EmbedResolverResult = {
      provider: 'dailymotion',
      id: 'x7tgad0',
      src: 'https://www.dailymotion.com/embed/video/x7tgad0',
      url: 'https://www.dailymotion.com/video/x7tgad0',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x7tgad0',
      ratio: '16/9',
    }

    expect(dailymotionResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve the start offset', () => {
    const value = 'https://www.dailymotion.com/embed/video/x8abcde?start=42'
    const expected: EmbedResolverResult = {
      provider: 'dailymotion',
      id: 'x8abcde',
      src: 'https://www.dailymotion.com/embed/video/x8abcde?start=42',
      url: 'https://www.dailymotion.com/video/x8abcde',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x8abcde',
      ratio: '16/9',
    }

    expect(dailymotionResolveEmbed(value)).toEqual(expected)
  })

  it('should drop tracking parameters', () => {
    const value = 'https://www.dailymotion.com/embed/video/x8abcde?utm_source=feed'
    const expected: EmbedResolverResult = {
      provider: 'dailymotion',
      id: 'x8abcde',
      src: 'https://www.dailymotion.com/embed/video/x8abcde',
      url: 'https://www.dailymotion.com/video/x8abcde',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x8abcde',
      ratio: '16/9',
    }

    expect(dailymotionResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a dailymotion url naming no video', () => {
    const value = 'https://www.dailymotion.com/about'

    expect(dailymotionResolveEmbed(value)).toBeUndefined()
  })

  // Reaches the playlist reader's own parse guard: the video readers refuse first, so the
  // unparseable url arrives at the playlist branch too.
  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(dailymotionResolveEmbed(value)).toBeUndefined()
  })

  // The id is qualified because a playlist and a video share one grammar, and enrichment sees
  // the provider and the id alone. No thumbnail: `/thumbnail/playlist/{id}` answers 404.
  it.each(playlistUrls)('should build the playlist player from %s', (value) => {
    const expected: EmbedResolverResult = {
      provider: 'dailymotion',
      id: 'playlist/x6zqmk',
      src: 'https://www.dailymotion.com/embed/playlist/x6zqmk',
      url: 'https://www.dailymotion.com/playlist/x6zqmk',
    }

    expect(dailymotionResolveEmbed(value)).toEqual(expected)
  })

  // A video playing inside a playlist is still a video, so the playlist branch must not take it.
  it('should keep a video that names a playlist as a video', () => {
    const value = 'https://www.dailymotion.com/embed/video/x7tgad0?playlist=x6zqmk'
    const expected: EmbedResolverResult = {
      provider: 'dailymotion',
      id: 'x7tgad0',
      src: 'https://www.dailymotion.com/embed/video/x7tgad0?playlist=x6zqmk',
      url: 'https://www.dailymotion.com/video/x7tgad0',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x7tgad0',
      ratio: '16/9',
    }

    expect(dailymotionResolveEmbed(value)).toEqual(expected)
  })
})

describeForEachParser('dailymotionEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, dailymotionEmbedResolver)

  it('should resolve a dailymotion iframe', async () => {
    const value = '<iframe src="https://www.dailymotion.com/embed/video/x7tgad0"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'dailymotion',
      id: 'x7tgad0',
      src: 'https://www.dailymotion.com/embed/video/x7tgad0',
      url: 'https://www.dailymotion.com/video/x7tgad0',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x7tgad0',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a non-dailymotion iframe', async () => {
    const value = '<iframe src="https://example.com/video"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
