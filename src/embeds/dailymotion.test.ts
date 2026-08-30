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
  'https://geo.dailymotion.com/player.html?video=x7tgad0',
  // Share urls append a title slug to the id.
  'https://www.dailymotion.com/video/x7tgad0_some-title',
]

describe('extractDailymotionId', () => {
  it.each(videoUrls)('should extract the id from %s', (value) => {
    expect(extractDailymotionId(value)).toBe('x7tgad0')
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
    }

    expect(dailymotionResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a dailymotion url naming no video', () => {
    const value = 'https://www.dailymotion.com/about'

    expect(dailymotionResolveEmbed(value)).toBeUndefined()
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
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a non-dailymotion iframe', async () => {
    const value = '<iframe src="https://example.com/video"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
