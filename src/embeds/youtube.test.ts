import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  composeEmbedUrl,
  composeThumbnailUrl,
  extractVideoId,
  isVideoId,
  youtubeAmpEmbedResolver,
  youtubeIframeEmbedResolver,
  youtubeResolveEmbed,
} from './youtube.js'

// Every url spelling that names a single video, current and legacy. All extract the same id,
// so a deleted row is a format that silently lost support.
const videoUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
  // The path spelling of the watch page.
  'https://www.youtube.com/watch/dQw4w9WgXcQ',
  'https://www.youtube.com/watch?vi=dQw4w9WgXcQ',
  'https://www.youtube.com/watch_popup?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abc',
  'https://www.youtube.com/live/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  // Authoring mistakes: YouTube serves a player page for both but cues nothing.
  'https://www.youtube.com/embed/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/embed/shorts/dQw4w9WgXcQ',
  // The Flash-era player path, with the era's `&`-and-no-`?` parameter spelling, and its
  // googleapis host still shipped by Blogger feeds.
  'http://www.youtube.com/v/dQw4w9WgXcQ',
  'http://www.youtube.com/v/dQw4w9WgXcQ&hl=en_US&fs=1&',
  'http://youtube.googleapis.com/v/dQw4w9WgXcQ&hl=en_US',
  // The /e/ embed and /w/ watch aliases of the same era, and the old /video/ share url.
  'http://www.youtube.com/e/dQw4w9WgXcQ',
  'http://www.youtube.com/w/dQw4w9WgXcQ',
  'http://www.youtube.com/video/dQw4w9WgXcQ',
  // The Flash-era chromeless player endpoints, carrying the id as `video_id`.
  'http://www.youtube.com/apiplayer?video_id=dQw4w9WgXcQ&version=3',
  'http://www.youtube.com/get_video_info?video_id=dQw4w9WgXcQ&el=embedded',
  // The 2010 AJAX site and its profile grids kept the id in the fragment.
  'http://www.youtube.com/watch#!v=dQw4w9WgXcQ&feature=related',
  'http://www.youtube.com/user/SomeUser#p/u/1/dQw4w9WgXcQ',
  'http://www.youtube.com/user/SomeUser#p/a/u/0/dQw4w9WgXcQ',
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  // The stray quote Steam news leaks into embed srcs.
  'https://www.youtube-nocookie.com/embed/"dQw4w9WgXcQ?fs=1&rel=0',
]

describe('extractVideoId', () => {
  it.each(videoUrls)('should extract the id from %s', (value) => {
    expect(extractVideoId(value)).toBe('dQw4w9WgXcQ')
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

  // The 16-char segment is a legacy playlist id, so the grid link names no video.
  it('should return undefined for a profile-grid playlist link with no video id', () => {
    const value = 'http://www.youtube.com/user/SomeUser#p/c/C791A17F9108460C'

    expect(extractVideoId(value)).toBeUndefined()
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
      ratio: '16/9',
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
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve the start offset', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=90'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=90',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve the playlist and its position', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?list=PLabc123&index=4'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?list=PLabc123&index=4',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve both halves of a clip', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?clip=Ug1x&clipt=EIDh'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?clip=Ug1x&clipt=EIDh',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should drop player and tracking parameters', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc&autoplay=1&rel=0'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve youtu.be short url', () => {
    const value = 'https://youtu.be/dQw4w9WgXcQ'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
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
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve the self-loop playlist pair', () => {
    const value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?loop=1&playlist=dQw4w9WgXcQ'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?playlist=dQw4w9WgXcQ&loop=1',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  // Every spelling of a playlist embed: the videoseries path word, the bare embed path some
  // WordPress plugins emit, and the nocookie host. All resolve to the same posterless
  // placeholder, so a deleted row is a spelling that silently lost support.
  const playlistUrls = [
    'https://www.youtube.com/embed/videoseries?list=PLabc123',
    'https://www.youtube.com/embed/?list=PLabc123',
    'https://www.youtube.com/embed/?listType=playlist&list=PLabc123',
    'https://www.youtube.com/embed?listType=playlist&list=PLabc123',
    'https://www.youtube-nocookie.com/embed/videoseries?list=PLabc123',
  ]

  it.each(playlistUrls)('should resolve %s to the playlist embed, posterless', (value) => {
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'PLabc123',
      src: 'https://www.youtube.com/embed/videoseries?list=PLabc123',
      url: 'https://www.youtube.com/playlist?list=PLabc123',
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve a user_uploads embed to the channel uploads, posterless', () => {
    const value = 'https://www.youtube.com/embed?listType=user_uploads&list=SomeUser'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'SomeUser',
      src: 'https://www.youtube.com/embed?listType=user_uploads&list=SomeUser',
      url: 'https://www.youtube.com/user/SomeUser',
      ratio: '16/9',
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
      ratio: '16/9',
    }

    expect(youtubeResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a videoseries embed with no list', () => {
    const value = 'https://www.youtube.com/embed/videoseries'

    expect(youtubeResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a bare embed url naming no content', () => {
    const value = 'https://www.youtube.com/embed/?wmode=transparent'

    expect(youtubeResolveEmbed(value)).toBeUndefined()
  })

  // `listType=search` named a query, not an id, and YouTube removed it in 2020: deliberately
  // left for the generic handling, which keeps whatever the publisher wrote.
  it('should not claim a listType=search embed', () => {
    const value = 'https://www.youtube.com/embed?listType=search&list=sunrise+timelapse'

    expect(youtubeResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a user_uploads embed with no list', () => {
    const value = 'https://www.youtube.com/embed?listType=user_uploads'

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

  // The Flash player took its playlist on `/p/{id}`, and its 16 hex characters are the modern
  // `list=PL{id}` without the prefix. The swf is dead, so these render nothing today.
  describe('the Flash-era playlist player', () => {
    it('should resolve a /p/ playlist to the playlist embed, posterless', () => {
      const value = 'http://www.youtube.com/p/7BE4DDAC0A0D31AF?hl=es_ES&fs=1'
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'PL7BE4DDAC0A0D31AF',
        src: 'https://www.youtube.com/embed/videoseries?list=PL7BE4DDAC0A0D31AF',
        url: 'https://www.youtube.com/playlist?list=PL7BE4DDAC0A0D31AF',
        ratio: '16/9',
      }

      expect(youtubeResolveEmbed(value)).toEqual(expected)
    })

    // Half the corpus specimens join the player options with `&` instead of `?`, so the id
    // arrives as the head of the path segment rather than as the whole of it.
    it('should resolve a /p/ playlist whose options ride on a stray ampersand', () => {
      const value = 'http://www.youtube.com/p/B863A0EC10FE8F5B&hl=en&fs=1'
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'PLB863A0EC10FE8F5B',
        src: 'https://www.youtube.com/embed/videoseries?list=PLB863A0EC10FE8F5B',
        url: 'https://www.youtube.com/playlist?list=PLB863A0EC10FE8F5B',
        ratio: '16/9',
      }

      expect(youtubeResolveEmbed(value)).toEqual(expected)
    })

    it('should refuse a /p/ id that is not 16 hex characters', () => {
      const value = 'http://www.youtube.com/p/somechannelname'

      expect(youtubeResolveEmbed(value)).toBeUndefined()
    })

    // A playlist id is case sensitive, so a lowercase spelling would mint a url that 404s.
    it('should refuse a lowercase /p/ id', () => {
      const value = 'http://www.youtube.com/p/7be4ddac0a0d31af'

      expect(youtubeResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse a bare /p/ path naming no playlist', () => {
      const value = 'http://www.youtube.com/p/'

      expect(youtubeResolveEmbed(value)).toBeUndefined()
    })
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
    const value = 'dQw4w9WgXcQ'
    const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=42'

    expect(composeEmbedUrl(value, { start: '42' })).toBe(expected)
  })

  it('should join several params with an ampersand', () => {
    const value = 'videoseries'
    const expected = 'https://www.youtube.com/embed/videoseries?list=PL1&index=2'

    expect(composeEmbedUrl(value, { list: 'PL1', index: '2' })).toBe(expected)
  })

  it('should stay bare for an empty param object', () => {
    const value = 'dQw4w9WgXcQ'
    const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ'

    expect(composeEmbedUrl(value, {})).toBe(expected)
  })

  // One param whose value happens to contain the separator, not two params. Encoding is what
  // keeps it that way, so a feed cannot smuggle `autoplay` in through a list id.
  it('should encode a separator inside a value instead of starting a new param', () => {
    const value = 'videoseries'
    const expected = 'https://www.youtube.com/embed/videoseries?list=PL1%26autoplay%3D1'

    expect(composeEmbedUrl(value, { list: 'PL1&autoplay=1' })).toBe(expected)
  })
})

describe('composeThumbnailUrl', () => {
  it('should build hqdefault thumbnail url', () => {
    const value = 'dQw4w9WgXcQ'
    const expected = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'

    expect(composeThumbnailUrl(value)).toBe(expected)
  })
})

describeForEachParser('youtubeIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, youtubeIframeEmbedResolver)

  it('should extract metadata from a youtube iframe', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should extract metadata from a youtube subdomain iframe', async () => {
    const value = '<iframe src="https://m.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should extract metadata from a youtu.be iframe', async () => {
    const value = '<iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined for non-youtube iframes', async () => {
    const value = '<iframe src="https://example.com/video"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  // Regression: a non-youtube host carrying a watch?v=<id> shaped query must
  // not be claimed just because extractVideoId could parse the id from it.
  it('should reject iframe with valid video id but wrong host', async () => {
    const value = '<iframe src="https://evil.com/watch?v=dQw4w9WgXcQ"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  it('should return undefined for an iframe with an empty src', async () => {
    const value = '<iframe src=""></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  // The Flash playlist arrives on an `<embed>`, never an iframe: the form predates the iframe
  // player, so the carrier is the half of this that has to keep working.
  it('should extract the playlist from a Flash embed carrier', async () => {
    const value = html`
      <embed
        src="http://www.youtube.com/p/7BE4DDAC0A0D31AF?hl=es_ES&fs=1"
        type="application/x-shockwave-flash"
      />
    `
    const expected: EmbedResolverResult = {
      provider: 'youtube',
      id: 'PL7BE4DDAC0A0D31AF',
      src: 'https://www.youtube.com/embed/videoseries?list=PL7BE4DDAC0A0D31AF',
      url: 'https://www.youtube.com/playlist?list=PL7BE4DDAC0A0D31AF',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })
})

describeForEachParser('youtubeAmpEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, youtubeAmpEmbedResolver)

  describe('happy paths', () => {
    it('should extract metadata from the videoid alone', async () => {
      const value = '<amp-youtube data-videoid="dQw4w9WgXcQ"></amp-youtube>'
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the player ratio over the size the element declares', async () => {
      const value = html`
        <amp-youtube
          data-videoid="dQw4w9WgXcQ"
          width="480"
          height="270"
          layout="responsive"
        ></amp-youtube>
      `
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry the playback window from data-param attributes', async () => {
      const value = html`
        <amp-youtube data-videoid="dQw4w9WgXcQ" data-param-start="30" data-param-end="90">
        </amp-youtube>
      `
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30&end=90',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry the playlist and its position from data-param attributes', async () => {
      const value = html`
        <amp-youtube
          data-videoid="dQw4w9WgXcQ"
          data-param-list="PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
          data-param-index="2"
        >
        </amp-youtube>
      `
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&index=2',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The same set the url form keeps, so an AMP embed and an ordinary one resolve alike:
    // autoplay, rel and the rest change nothing a reader can see from a placeholder.
    it('should drop data-param attributes outside the carried set', async () => {
      const value = html`
        <amp-youtube data-videoid="dQw4w9WgXcQ" data-param-autoplay="1" data-param-rel="0">
        </amp-youtube>
      `
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an element with no videoid', async () => {
      const value = '<amp-youtube width="480" height="270"></amp-youtube>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty videoid', async () => {
      const value = '<amp-youtube data-videoid=""></amp-youtube>'

      expect(await extract(value)).toBeUndefined()
    })

    // A bogus id would mint a bogus player url and a bogus enrichment key, so the element is
    // left for the generic handling instead, exactly as the url form treats a malformed id.
    it('should return undefined for a malformed videoid', async () => {
      const value = '<amp-youtube data-videoid="../../evil"></amp-youtube>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an embed path word in the videoid', async () => {
      const value = '<amp-youtube data-videoid="videoseries"></amp-youtube>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a malformed live channel id', async () => {
      const value = '<amp-youtube data-live-channelid="../../evil"></amp-youtube>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the channel-live variant', () => {
    it('should resolve data-live-channelid to the channel live embed, posterless', async () => {
      const value = '<amp-youtube data-live-channelid="UCuAXFkgsw1L7xaCfnd5JJOw"></amp-youtube>'
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        src: 'https://www.youtube.com/embed/live_stream?channel=UCuAXFkgsw1L7xaCfnd5JJOw',
        url: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the video over the channel when the element states both', async () => {
      const value = html`
        <amp-youtube
          data-videoid="dQw4w9WgXcQ"
          data-live-channelid="UCuAXFkgsw1L7xaCfnd5JJOw"
        ></amp-youtube>
      `
      const expected: EmbedResolverResult = {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
