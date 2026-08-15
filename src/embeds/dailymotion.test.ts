import { describe, expect, it } from 'bun:test'
import { describeForEachParser, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  dailymotionEmbedResolver,
  dailymotionResolveEmbed,
  extractDailymotionId,
} from './dailymotion.js'

describe('extractDailymotionId', () => {
  it('should extract id from a video url', () => {
    const value = 'https://www.dailymotion.com/video/x7tgad0'
    const expected = 'x7tgad0'

    expect(extractDailymotionId(value)).toBe(expected)
  })

  it('should extract id from a dai.ly short url', () => {
    const value = 'https://dai.ly/x7tgad0'
    const expected = 'x7tgad0'

    expect(extractDailymotionId(value)).toBe(expected)
  })

  it('should extract id from an embed url', () => {
    const value = 'https://www.dailymotion.com/embed/video/x7tgad0'
    const expected = 'x7tgad0'

    expect(extractDailymotionId(value)).toBe(expected)
  })

  // Both forms the Flash player shipped.
  it('should extract id from the swf player url', () => {
    const value = 'http://www.dailymotion.com/swf/x7tgad0'
    const expected = 'x7tgad0'

    expect(extractDailymotionId(value)).toBe(expected)
  })

  it('should extract id from the swf player url carrying a video segment', () => {
    const value = 'http://www.dailymotion.com/swf/video/x7tgad0'
    const expected = 'x7tgad0'

    expect(extractDailymotionId(value)).toBe(expected)
  })

  it('should extract id from the geo player url', () => {
    const value = 'https://geo.dailymotion.com/player.html?video=x7tgad0'
    const expected = 'x7tgad0'

    expect(extractDailymotionId(value)).toBe(expected)
  })

  it('should strip a title slug suffix', () => {
    const value = 'https://www.dailymotion.com/video/x7tgad0_some-title'
    const expected = 'x7tgad0'

    expect(extractDailymotionId(value)).toBe(expected)
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
  const resolve = resolverExtractor(parseHtml, dailymotionEmbedResolver)

  it('should resolve a dailymotion iframe', async () => {
    const value = '<iframe src="https://www.dailymotion.com/embed/video/x7tgad0"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'dailymotion',
      id: 'x7tgad0',
      src: 'https://www.dailymotion.com/embed/video/x7tgad0',
      url: 'https://www.dailymotion.com/video/x7tgad0',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x7tgad0',
    }

    expect(await resolve(value)).toEqual(expected)
  })

  it('should ignore a non-dailymotion iframe', async () => {
    const value = '<iframe src="https://example.com/video"></iframe>'

    expect(await resolve(value)).toBeUndefined()
  })
})
