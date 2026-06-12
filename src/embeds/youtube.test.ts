import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  composeThumbnailUrl,
  extractVideoId,
  youtubeEmbedResolver,
  youtubeResolveEmbed,
} from './youtube.js'

describe('extractVideoId', () => {
  it('should extract id from standard watch url', () => {
    const value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from watch url with extra params', () => {
    const value =
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from youtu.be short url', () => {
    const value = 'https://youtu.be/dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from www.youtu.be url', () => {
    const value = 'https://www.youtu.be/dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from shorts url', () => {
    const value = 'https://www.youtube.com/shorts/dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from mobile youtube url', () => {
    const value = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from music.youtube.com url', () => {
    const value = 'https://music.youtube.com/watch?v=dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from bare youtube.com url', () => {
    const value = 'https://youtube.com/watch?v=dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from embed url', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should return undefined for invalid url', () => {
    const value = 'not-a-url'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    const value = ''

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should reject video id with unsafe characters', () => {
    const value = 'https://www.youtube.com/watch?v=<script>alert(1)</script>'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should return undefined for shorts url with no id', () => {
    const value = 'https://www.youtube.com/shorts/'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should return undefined for embed url with no id', () => {
    const value = 'https://www.youtube.com/embed/'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should return undefined for playlist url', () => {
    const value = 'https://www.youtube.com/playlist?list=PLrAXtmErZgOe'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should return undefined for channel url', () => {
    const value = 'https://www.youtube.com/@channel'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should extract id from /v/ legacy embed url', () => {
    const value = 'https://www.youtube.com/v/dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from shorts url with trailing path', () => {
    const value = 'https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abc'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from /live/ url', () => {
    const value = 'https://www.youtube.com/live/dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should extract id from watch url with legacy ?vi= param', () => {
    const value = 'https://www.youtube.com/watch?vi=dQw4w9WgXcQ'
    const expected = 'dQw4w9WgXcQ'

    expect(extractVideoId(value)).toBe(expected)
  })

  it('should reject id shorter than 11 chars', () => {
    const value = 'https://www.youtube.com/watch?v=abc123'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should reject id longer than 11 chars', () => {
    const value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQextra'

    expect(extractVideoId(value)).toBeUndefined()
  })
})

describe('youtubeResolveEmbed', () => {
  it('should resolve youtube watch url', () => {
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual(expected)
  })

  it('should resolve youtube embed url', () => {
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual(expected)
  })

  it('should resolve youtu.be short url', () => {
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed('https://youtu.be/dQw4w9WgXcQ')).toEqual(expected)
  })

  it('should resolve youtube-nocookie embed url', () => {
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toEqual(
      expected,
    )
  })

  it('should return undefined for invalid url', () => {
    expect(youtubeResolveEmbed('not-a-url')).toBeUndefined()
  })
})

describe('composeThumbnailUrl', () => {
  it('should build hqdefault thumbnail url', () => {
    const value = 'dQw4w9WgXcQ'
    const expected = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'

    expect(composeThumbnailUrl(value)).toBe(expected)
  })
})

describeForEachParser('youtubeEmbedResolver', (parseHtml) => {
  const firstMatch = (html: string): Element | undefined => {
    return parseHtml(html).querySelector(youtubeEmbedResolver.selector) ?? undefined
  }

  it('should extract metadata from a youtube iframe', () => {
    const element = firstMatch('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>')
    const result = element ? youtubeEmbedResolver.extract(element) : undefined
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(result).toEqual(expected)
  })

  it('should extract metadata from a youtube subdomain iframe', () => {
    const element = firstMatch('<iframe src="https://m.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>')
    const result = element ? youtubeEmbedResolver.extract(element) : undefined
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(result).toEqual(expected)
  })

  it('should extract metadata from a youtu.be iframe', () => {
    const element = firstMatch('<iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>')
    const result = element ? youtubeEmbedResolver.extract(element) : undefined
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(result).toEqual(expected)
  })

  it('should return undefined for non-youtube iframes', () => {
    const element = firstMatch('<iframe src="https://example.com/video"></iframe>')
    const result = element ? youtubeEmbedResolver.extract(element) : undefined

    expect(result).toBeUndefined()
  })

  // Regression: a non-youtube host carrying a watch?v=<id> shaped query must
  // not be claimed just because extractVideoId could parse the id from it.
  it('should reject iframe with valid video id but wrong host', () => {
    const element = firstMatch('<iframe src="https://evil.com/watch?v=dQw4w9WgXcQ"></iframe>')
    const result = element ? youtubeEmbedResolver.extract(element) : undefined

    expect(result).toBeUndefined()
  })

  it('should return undefined for an iframe with an empty src', () => {
    const element = firstMatch('<iframe src=""></iframe>')
    const result = element ? youtubeEmbedResolver.extract(element) : undefined

    expect(result).toBeUndefined()
  })
})
