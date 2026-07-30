import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  composeEmbedUrl,
  composeThumbnailUrl,
  extractVideoId,
  isVideoId,
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

  it('should extract id from nocookie embed with a leaked leading quote', () => {
    const value = 'https://www.youtube-nocookie.com/embed/"Y2kC39Wihow?fs=1&modestbranding=1&rel=0'
    const expected = 'Y2kC39Wihow'

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

  it('should reject the videoseries playlist path-word', () => {
    const value = 'https://www.youtube.com/embed/videoseries?list=PLabc123'

    expect(extractVideoId(value)).toBeUndefined()
  })

  it('should reject the live_stream channel path-word', () => {
    const value = 'https://www.youtube.com/embed/live_stream?channel=UCabc123'

    expect(extractVideoId(value)).toBeUndefined()
  })
})

describe('youtubeResolveEmbed', () => {
  it('should resolve youtube watch url', () => {
    const value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve youtube embed url', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve the start offset', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=90'

    expect(youtubeResolveEmbed(value)?.src).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=90',
    )
  })

  it('should preserve the playlist and its position', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?list=PLabc123&index=4'

    expect(youtubeResolveEmbed(value)?.src).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?list=PLabc123&index=4',
    )
  })

  it('should preserve both halves of a clip', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?clip=Ug1x&clipt=EIDh'

    expect(youtubeResolveEmbed(value)?.src).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?clip=Ug1x&clipt=EIDh',
    )
  })

  it('should drop player and tracking parameters', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc&autoplay=1&rel=0'

    expect(youtubeResolveEmbed(value)?.src).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('should resolve youtu.be short url', () => {
    const value = 'https://youtu.be/dQw4w9WgXcQ'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve youtube-nocookie embed url', () => {
    const value = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve a videoseries playlist embed, posterless', () => {
    const value = 'https://www.youtube.com/embed/videoseries?list=PLabc123'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'PLabc123',
      src: 'https://www.youtube.com/embed/videoseries?list=PLabc123',
      url: 'https://www.youtube.com/playlist?list=PLabc123',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve a live_stream channel embed, posterless', () => {
    const value = 'https://www.youtube.com/embed/live_stream?channel=UCabc123'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'UCabc123',
      src: 'https://www.youtube.com/embed/live_stream?channel=UCabc123',
      url: 'https://www.youtube.com/channel/UCabc123',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should normalize a nocookie playlist embed to youtube.com', () => {
    const value = 'https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz'

    expect(youtubeResolveEmbed(value)?.src).toBe(
      'https://www.youtube.com/embed/videoseries?list=PLxyz',
    )
  })

  it('should return undefined for a videoseries embed with no list', () => {
    const value = 'https://www.youtube.com/embed/videoseries'

    expect(youtubeResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a live_stream embed with no channel', () => {
    const value = 'https://www.youtube.com/embed/live_stream'

    expect(youtubeResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for invalid url', () => {
    const value = 'not-a-url'

    expect(youtubeResolveEmbed(value)).toBeUndefined()
  })
})

describe('isVideoId', () => {
  describe('happy paths', () => {
    it('should accept an id of letters, digits, underscore and dash', () => {
      expect(isVideoId('dQw4w9WgXcQ')).toBe(true)
      expect(isVideoId('a_b-c1D2e3F')).toBe(true)
      expect(isVideoId('___________')).toBe(true)
    })
  })

  describe('sad paths', () => {
    it('should reject an id of the wrong length', () => {
      expect(isVideoId('dQw4w9WgXc')).toBe(false)
      expect(isVideoId('dQw4w9WgXcQQ')).toBe(false)
      expect(isVideoId('')).toBe(false)
    })

    it('should reject characters outside the id alphabet', () => {
      expect(isVideoId('dQw4w9WgXc.')).toBe(false)
      expect(isVideoId('dQw4w9WgX Q')).toBe(false)
      expect(isVideoId('dQw4w9WgXc/')).toBe(false)
    })

    it('should reject a path traversal that happens to be the right length', () => {
      expect(isVideoId('../../evil/')).toBe(false)
    })
  })

  describe('edge cases', () => {
    // Both are 11 valid id characters but name an embed path, so a video url built from
    // either would be bogus.
    it('should reject the playlist and live-stream path words', () => {
      expect(isVideoId('videoseries')).toBe(false)
      expect(isVideoId('live_stream')).toBe(false)
    })

    it('should reject an id padded with whitespace', () => {
      expect(isVideoId(' dQw4w9WgXcQ')).toBe(false)
      expect(isVideoId('dQw4w9WgXcQ\n')).toBe(false)
    })
  })
})

describe('composeEmbedUrl', () => {
  it('should build the player url from an id', () => {
    const value = 'dQw4w9WgXcQ'
    const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ'

    expect(composeEmbedUrl(value)).toBe(expected)
  })

  it('should append params as a query string', () => {
    const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=42'

    expect(composeEmbedUrl('dQw4w9WgXcQ', { start: '42' })).toBe(expected)
  })

  it('should join several params with an ampersand', () => {
    const expected = 'https://www.youtube.com/embed/videoseries?list=PL1&index=2'

    expect(composeEmbedUrl('videoseries', { list: 'PL1', index: '2' })).toBe(expected)
  })

  it('should stay bare for an empty param object', () => {
    const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ'

    expect(composeEmbedUrl('dQw4w9WgXcQ', {})).toBe(expected)
  })

  // One param whose value happens to contain the separator, not two params. Encoding is what
  // keeps it that way, so a feed cannot smuggle `autoplay` in through a list id.
  it('should encode a separator inside a value instead of starting a new param', () => {
    const expected = 'https://www.youtube.com/embed/videoseries?list=PL1%26autoplay%3D1'

    expect(composeEmbedUrl('videoseries', { list: 'PL1&autoplay=1' })).toBe(expected)
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
