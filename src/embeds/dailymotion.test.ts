import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import {
  dailymotionEmbedResolver,
  dailymotionResolveEmbed,
  extractDailymotionId,
} from './dailymotion.js'

describe('extractDailymotionId', () => {
  it('should extract id from a video url', () => {
    expect(extractDailymotionId('https://www.dailymotion.com/video/x7tgad0')).toBe('x7tgad0')
  })

  it('should extract id from a dai.ly short url', () => {
    expect(extractDailymotionId('https://dai.ly/x7tgad0')).toBe('x7tgad0')
  })

  it('should extract id from an embed url', () => {
    expect(extractDailymotionId('https://www.dailymotion.com/embed/video/x7tgad0')).toBe('x7tgad0')
  })

  // Both forms the Flash player shipped.
  it('should extract id from the swf player url', () => {
    expect(extractDailymotionId('http://www.dailymotion.com/swf/x7tgad0')).toBe('x7tgad0')
  })

  it('should extract id from the swf player url carrying a video segment', () => {
    expect(extractDailymotionId('http://www.dailymotion.com/swf/video/x7tgad0')).toBe('x7tgad0')
  })

  it('should extract id from the geo player url', () => {
    expect(extractDailymotionId('https://geo.dailymotion.com/player.html?video=x7tgad0')).toBe(
      'x7tgad0',
    )
  })

  it('should strip a title slug suffix', () => {
    expect(extractDailymotionId('https://www.dailymotion.com/video/x7tgad0_some-title')).toBe(
      'x7tgad0',
    )
  })

  it('should return undefined for an invalid url', () => {
    expect(extractDailymotionId('not a url')).toBeUndefined()
  })
})

describe('dailymotionResolveEmbed', () => {
  it('should build the embed with a thumbnail', () => {
    const result = dailymotionResolveEmbed('https://www.dailymotion.com/video/x7tgad0')
    const expected = {
      provider: 'dailymotion',
      id: 'x7tgad0',
      src: 'https://www.dailymotion.com/embed/video/x7tgad0',
      url: 'https://www.dailymotion.com/video/x7tgad0',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x7tgad0',
    }

    expect(result).toEqual(expected)
  })

  it('should preserve the start offset', () => {
    const result = dailymotionResolveEmbed(
      'https://www.dailymotion.com/embed/video/x8abcde?start=42',
    )

    expect(result?.src).toBe('https://www.dailymotion.com/embed/video/x8abcde?start=42')
  })

  it('should drop tracking parameters', () => {
    const result = dailymotionResolveEmbed(
      'https://www.dailymotion.com/embed/video/x8abcde?utm_source=feed',
    )

    expect(result?.src).toBe('https://www.dailymotion.com/embed/video/x8abcde')
  })
})

describeForEachParser('dailymotionEmbedResolver', (parseHtml) => {
  const resolve = (value: string) => {
    const element = parseHtml(value).querySelector(dailymotionEmbedResolver.selector) ?? undefined
    return element ? dailymotionEmbedResolver.extract(element) : undefined
  }

  it('should resolve a dailymotion iframe', async () => {
    const result = await resolve(
      '<iframe src="https://www.dailymotion.com/embed/video/x7tgad0"></iframe>',
    )

    expect(result?.provider).toBe('dailymotion')
    expect(result?.id).toBe('x7tgad0')
  })

  it('should ignore a non-dailymotion iframe', async () => {
    const result = await resolve('<iframe src="https://example.com/video"></iframe>')

    expect(result).toBeUndefined()
  })
})
