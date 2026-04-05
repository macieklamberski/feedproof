import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { composeThumbnailUrl, extractVideoId, youtubeResolveEmbed } from './youtube.js'

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
})

describe('youtubeResolveEmbed', () => {
  it('should resolve youtube watch url', () => {
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      type: 'iframe',
    }

    expect(youtubeResolveEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual(expected)
  })

  it('should resolve youtube embed url', () => {
    expect(youtubeResolveEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ')?.provider).toBe(
      'youtube',
    )
  })

  it('should resolve youtu.be short url', () => {
    expect(youtubeResolveEmbed('https://youtu.be/dQw4w9WgXcQ')?.provider).toBe('youtube')
  })

  it('should resolve youtube-nocookie embed url', () => {
    expect(
      youtubeResolveEmbed('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')?.provider,
    ).toBe('youtube')
  })

  it('should return undefined for invalid url', () => {
    expect(youtubeResolveEmbed('not-a-url')).toBeUndefined()
  })
})

describe('composeThumbnailUrl', () => {
  it('should build maxresdefault thumbnail url', () => {
    const value = 'dQw4w9WgXcQ'
    const expected = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'

    expect(composeThumbnailUrl(value)).toBe(expected)
  })
})
