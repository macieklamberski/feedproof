import { describe, expect, it } from 'bun:test'
import { acastEmbedResolver } from '../../embeds/acast.js'
import { blubrryEmbedResolver } from '../../embeds/blubrry.js'
import { soundcloudEmbedResolver } from '../../embeds/soundcloud.js'
import { youtubeIframeEmbedResolver } from '../../embeds/youtube.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { EmbedResolver, Enclosure, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { injectEnclosures } from './injectEnclosures.js'
import { neutralizeUnsafeUrls } from './neutralizeUnsafeUrls.js'

const withResolver: TransformContext = {
  ...baseContext,
  widgetResolvers: [youtubeIframeEmbedResolver],
}

const withEnclosures = (enclosures: Array<Enclosure>): TransformContext => {
  return { ...withResolver, enclosures }
}

describeForEachParser('injectEnclosures', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [injectEnclosures(context)])
  }

  // SoundCloud distributes a podcast as the audio file itself, named after the track, so the
  // enclosure names a player even though it is a media url. Framing the file shows nothing,
  // which is what makes claiming it without recovering the track worse than leaving it alone.
  it('should inject a soundcloud podcast enclosure as its player', async () => {
    const value = '<p>Episode notes</p>'
    const context: TransformContext = {
      ...baseContext,
      widgetResolvers: [soundcloudEmbedResolver],
      enclosures: [
        {
          url: 'https://feeds.soundcloud.com/stream/2386923495-linear-digressions-ai.mp3',
          type: 'audio/mpeg',
        },
      ],
    }
    const expected = html`
      <div
        data-enclosure=""
        data-embed-height="166"
        data-embed-id="tracks/2386923495"
        data-embed-provider="soundcloud"
        data-embed-src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F2386923495"
      ></div>
      <p>Episode notes</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should inject a soundcloud audio enclosure naming no track as a native audio element', async () => {
    const value = '<p>Episode notes</p>'
    const context: TransformContext = {
      ...baseContext,
      widgetResolvers: [soundcloudEmbedResolver],
      enclosures: [
        { url: 'https://feeds.soundcloud.com/stream/nameless-episode.mp3', type: 'audio/mpeg' },
      ],
    }
    const expected = html`
      <audio
        src="https://feeds.soundcloud.com/stream/nameless-episode.mp3"
        controls
        data-enclosure=""
      ></audio>
      <p>Episode notes</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should inject video enclosure as native video element', async () => {
    const value = '<p>Episode notes</p>'
    const context = withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }])
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        data-enclosure=""
      ></video>
      <p>Episode notes</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should inject enclosure before existing content', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }]),
    )
    const embedIndex = result.indexOf('<audio')
    const contentIndex = result.indexOf('Episode notes')

    expect(embedIndex).toBeLessThan(contentIndex)
  })

  it('should inject audio enclosure as native audio element', async () => {
    const value = '<p>Episode notes</p>'
    const context = withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }])
    const expected = html`
      <audio
        src="https://example.com/episode.mp3"
        controls
        data-enclosure=""
      ></audio>
      <p>Episode notes</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should resolve video enclosure through embedResolver', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' }]),
    )

    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-enclosure=""
      ></div>
      <p>Episode notes</p>
    `

    expect(result).toEqualHtml(expected)
  })

  it('should embed a player URL even when no resolver claims it', async () => {
    const result = await transform(
      '<p>Notes</p>',
      withEnclosures([
        {
          url: 'https://vimeo.com/76979871',
          playerUrl: 'https://player.vimeo.com/video/76979871',
          medium: 'video',
          thumbnails: [{ url: 'https://i.vimeocdn.com/video/76979871.jpg' }],
        },
      ]),
    )

    const expected = html`
      <div
        data-embed-src="https://player.vimeo.com/video/76979871"
        data-embed-thumbnail="https://i.vimeocdn.com/video/76979871.jpg"
        data-enclosure=""
      ></div>
      <p>Notes</p>
    `

    expect(result).toEqualHtml(expected)
  })

  it('should prefer the player URL over the content URL for resolution', async () => {
    const result = await transform(
      '<p>Notes</p>',
      withEnclosures([
        {
          url: 'https://example.com/watch/123',
          playerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          medium: 'video',
        },
      ]),
    )

    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-enclosure=""
      ></div>
      <p>Notes</p>
    `

    expect(result).toEqualHtml(expected)
  })

  it('should carry the feed thumbnail onto a resolved embed instead of the composed guess', async () => {
    const result = await transform(
      '<p>Notes</p>',
      withEnclosures([
        {
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          medium: 'video',
          thumbnails: [{ url: 'https://cdn.example.com/feed-thumb.jpg' }],
        },
      ]),
    )

    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://cdn.example.com/feed-thumb.jpg"
        data-embed-ratio="16/9"
        data-enclosure=""
      ></div>
      <p>Notes</p>
    `

    expect(result).toEqualHtml(expected)
  })

  it('should keep the composed thumbnail when the feed provides none', async () => {
    const value = '<p>Notes</p>'
    const context = withEnclosures([
      { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' },
    ])
    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-enclosure=""
      ></div>
      <p>Notes</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should carry the enclosure duration onto the embed', async () => {
    const result = await transform(
      '<p>Notes</p>',
      withEnclosures([
        { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video', duration: 212 },
      ]),
    )

    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-duration="212"
        data-enclosure=""
      ></div>
      <p>Notes</p>
    `

    expect(result).toEqualHtml(expected)
  })

  // A placeholder built from an enclosure carries its urls on the same terms as one built from
  // the markup: every url resolved, and the canonical one cleaned.
  describe('placeholder fields', () => {
    const exampleResolver: EmbedResolver = {
      kind: 'embed',
      selector: 'iframe[src*="example.com"]',
      extract: () => ({
        provider: 'example',
        src: 'https://example.com/e/x',
        url: 'https://example.com/watch/x?utm_source=feed',
      }),
    }

    const withExampleResolver = (enclosures: Array<Enclosure>): TransformContext => {
      return {
        ...baseContext,
        widgetResolvers: [exampleResolver],
        baseUrl: 'https://publisher.example/post',
        enclosures,
      }
    }

    it('should resolve a feed thumbnail stated as a relative url', async () => {
      const value = '<p>Content</p>'
      const context = withExampleResolver([
        {
          url: 'https://example.com/e/x',
          medium: 'video',
          thumbnails: [{ url: '/uploads/thumb.jpg' }],
        },
      ])
      const expected = html`
        <div
          data-embed-src="https://example.com/e/x"
          data-embed-provider="example"
          data-embed-url="https://example.com/watch/x?utm_source=feed"
          data-embed-thumbnail="https://publisher.example/uploads/thumb.jpg"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should clean a resolver url with the provided cleanUrlFn', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withExampleResolver([{ url: 'https://example.com/e/x', medium: 'video' }]),
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const expected = html`
        <div
          data-embed-src="https://example.com/e/x"
          data-embed-provider="example"
          data-embed-url="https://example.com/watch/x"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })

  describe('image enclosures', () => {
    it('should inject image enclosure as img element', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])
      const expected = html`
        <img src="https://example.com/photo.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should detect image by medium field', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', medium: 'image' }])
      const expected = html`
        <img src="https://example.com/photo.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should inject multiple image enclosures as stacked images in order', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/one.jpg', type: 'image/jpeg' },
        { url: 'https://example.com/two.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/one.jpg" data-enclosure="">
        <img src="https://example.com/two.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should inject both image and audio enclosures', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
        { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <audio
          src="https://example.com/episode.mp3"
          controls
          data-enclosure=""
        ></audio>
        <img src="https://example.com/cover.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should emit width, height, and alt on image enclosure when provided', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        {
          url: 'https://example.com/photo.jpg',
          type: 'image/jpeg',
          width: 800,
          height: 600,
          title: 'A photo',
        },
      ])
      const expected = html`
        <img src="https://example.com/photo.jpg" width="800" height="600" alt="A photo" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should resolve a relative image enclosure url against the base url', async () => {
      const value = '<p>Content</p>'
      const context = {
        ...withEnclosures([{ url: '/photo.jpg', type: 'image/jpeg' }]),
        baseUrl: 'https://example.com',
      }
      const expected = html`
        <img src="https://example.com/photo.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should not inject an image enclosure when content already has an image', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/inline.jpg">
      `
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should not inject an image enclosure when content has a picture element', async () => {
      const value = html`
        <picture>
          <img src="https://example.com/inline.jpg">
        </picture>
      `
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should still inject audio and video enclosures when content has an image', async () => {
      const value = '<p>Content</p><img src="https://example.com/inline.jpg">'
      const context = withEnclosures([
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
        { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
        { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <audio
          src="https://example.com/episode.mp3"
          controls
          data-enclosure=""
        ></audio>
        <video
          src="https://example.com/clip.mp4"
          controls
          data-enclosure=""
        ></video>
        <p>Content</p>
        <img src="https://example.com/inline.jpg">
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should not inject a gravatar avatar as the lead image of imageless content', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://2.gravatar.com/avatar/abc123?s=96&d=identicon', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should keep a real image enclosure and skip the gravatar avatar in the same item', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://gravatar.com/avatar/abc123', type: 'image/jpeg' },
        { url: 'https://example.com/photo.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/photo.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should inject one image when enclosures differ only by query, keeping the original', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/cover.jpg?w=300', type: 'image/jpeg' },
        { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/cover.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    // A feed listing one picture as both a native enclosure and a media:content can spell the
    // two differently, and the fingerprint that collapses them only compares hosts and paths.
    it('should inject one image when enclosures differ only by a missing scheme', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
        { url: '//example.com/cover.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/cover.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should not inject a gravatar avatar that states no scheme', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: '//2.gravatar.com/avatar/abc123?s=96&d=identicon', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).toEqualHtml(value)
    })

    // Substack puts a post's cover image in the enclosure, and a post with no cover gets the
    // publication logo there instead, so the logo would head every imageless post.
    it('should not inject an image enclosure that is the feed image', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([{ url: 'https://example.com/logo.png', type: 'image/jpeg' }]),
        feedImageUrls: ['https://example.com/logo.png'],
      }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should not inject the feed image served as another rendition', async () => {
      const value = '<p>Content</p>'
      const logo = 'https%3A%2F%2Fmedia.example.com%2Fpublic%2Fimages%2Flogo_1010x1010.png'
      const context: TransformContext = {
        ...withEnclosures([
          {
            url: `https://substackcdn.com/image/fetch/$s_!9H2b!,w_256,c_limit,f_auto/${logo}`,
            type: 'image/jpeg',
          },
        ]),
        feedImageUrls: [`https://substackcdn.com/image/fetch/w_512,c_limit,f_auto/${logo}`],
      }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should keep a real image enclosure and skip the feed image in the same item', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([
          { url: 'https://example.com/logo.png', type: 'image/jpeg' },
          { url: 'https://example.com/photo.jpg', type: 'image/jpeg' },
        ]),
        feedImageUrls: ['https://example.com/logo.png'],
      }
      const expected = html`
        <img src="https://example.com/photo.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should collapse a WordPress -WxH variant to the full-res original', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/uploads/photo.jpg', type: 'image/jpeg' },
        { url: 'https://example.com/uploads/photo-800x450.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/uploads/photo.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should keep the larger of two sized variants', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/cover.jpg?w=300', type: 'image/jpeg' },
        { url: 'https://example.com/cover.jpg?w=900', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/cover.jpg?w=900" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should prefer the no-query URL when colliding variants have no size to compare', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/cover.jpg?v=2', type: 'image/jpeg' },
        { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/cover.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should keep distinct images that differ by path', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/a/photo.jpg', type: 'image/jpeg' },
        { url: 'https://example.com/b/photo.jpg', type: 'image/jpeg' },
      ])
      const expected = html`
        <img src="https://example.com/a/photo.jpg" data-enclosure="">
        <img src="https://example.com/b/photo.jpg" data-enclosure="">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })

  describe('player page enclosures', () => {
    it('should merge a player page enclosure with its media file into one embed', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fep.mp3' },
        { url: 'https://example.com/ep.mp3', type: 'audio/mpeg' },
      ])
      const expected = html`
        <div
          data-embed-src="https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fep.mp3"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should fill missing display size from the player page and keep the file metadata', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://player.example.com/embed?file=https://example.com/ep.mp3', height: 165 },
        { url: 'https://example.com/ep.mp3', type: 'audio/mpeg', duration: 843 },
      ])
      const expected = html`
        <div
          data-embed-src="https://player.example.com/embed?file=https://example.com/ep.mp3"
          data-embed-height="165"
          data-embed-duration="843"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    // Width and height are one measurement and come from one side. A feed stating only a width
    // beside a resolver's fixed player height once produced 320x138 for a fluid-width bar, a box
    // nobody measured. The feed's pair now stands whole where it states any part of one.
    it('should take the size from the feed as a pair rather than merge it with the resolver height', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([
          { url: 'https://player.blubrry.com/id/12345678/', type: 'text/html', width: 320 },
        ]),
        widgetResolvers: [blubrryEmbedResolver],
      }
      const expected = html`
        <div
          data-embed-src="https://player.blubrry.com/id/12345678/"
          data-embed-provider="blubrry"
          data-embed-id="12345678"
          data-embed-width="320"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    // Acast's player is 190 tall whatever the carrier says, which is why the resolver opts out of
    // declared sizes. A feed's stated size is the same kind of claim as a publisher's markup, so
    // the opt-out covers it too.
    it('should keep the resolver height over the feed size when the resolver ignores declared sizes', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([
          { url: 'https://embed.acast.com/myshow/myepisode', type: 'text/html', width: 320 },
        ]),
        widgetResolvers: [acastEmbedResolver],
      }
      const expected = html`
        <div
          data-embed-src="https://embed.acast.com/myshow/myepisode"
          data-embed-provider="acast"
          data-embed-id="myshow/myepisode"
          data-embed-height="190"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should keep the resolver height when the feed states no size at all', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([{ url: 'https://embed.acast.com/myshow/myepisode', type: 'text/html' }]),
        widgetResolvers: [acastEmbedResolver],
      }
      const expected = html`
        <div
          data-embed-src="https://embed.acast.com/myshow/myepisode"
          data-embed-provider="acast"
          data-embed-id="myshow/myepisode"
          data-embed-height="190"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should not merge a file entry into a player page with a different nested url', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fother.mp3' },
        { url: 'https://example.com/ep.mp3', type: 'audio/mpeg' },
      ])
      const expected = html`
        <audio
          src="https://example.com/ep.mp3"
          controls
          data-enclosure=""
        ></audio>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should parse a playerEmbed enclosure and merge it with its media file', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        {
          playerEmbed:
            '<iframe src="https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fep.mp3&amp;modern=1" scrolling="no" width="100%" height="165"></iframe>',
        },
        { url: 'https://example.com/ep.mp3', type: 'audio/mpeg' },
      ])
      const expected = html`
        <div
          data-embed-src="https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fep.mp3&amp;modern=1"
          data-embed-height="165"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should drop a playerEmbed enclosure without an iframe src', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { playerEmbed: '<p>player</p>' },
        { url: 'https://example.com/ep.mp3', type: 'audio/mpeg' },
      ])
      const expected = html`
        <audio
          src="https://example.com/ep.mp3"
          controls
          data-enclosure=""
        ></audio>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should merge using cleanUrlFn-normalized urls', async () => {
      const value = '<p>Content</p>'
      const context = {
        ...withEnclosures([
          { url: 'https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fep.mp3' },
          { url: 'https://example.com/ep.mp3?utm_source=feed', type: 'audio/mpeg' },
        ]),
        cleanUrlFn: (url: string) => url.split('?')[0],
      }
      const expected = html`
        <div
          data-embed-src="https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fep.mp3"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })

  describe('media groups', () => {
    it('should inject one rendition of a group, preferring the default', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        {
          url: 'https://example.com/clip-360.mp4',
          type: 'video/mp4',
          width: 640,
          height: 360,
          groupIndex: 0,
        },
        {
          url: 'https://example.com/clip-720.mp4',
          type: 'video/mp4',
          width: 1280,
          height: 720,
          isDefault: true,
          groupIndex: 0,
        },
        {
          url: 'https://example.com/clip-1080.mp4',
          type: 'video/mp4',
          width: 1920,
          height: 1080,
          groupIndex: 0,
        },
      ])
      const expected = html`
        <video
          src="https://example.com/clip-720.mp4"
          width="1280"
          height="720"
          controls
          data-enclosure=""
        ></video>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should inject the first rendition of a group without a default', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        {
          url: 'https://example.com/clip-360.mp4',
          type: 'video/mp4',
          width: 640,
          height: 360,
          groupIndex: 0,
        },
        {
          url: 'https://example.com/clip-1080.mp4',
          type: 'video/mp4',
          width: 1920,
          height: 1080,
          groupIndex: 0,
        },
        {
          url: 'https://example.com/clip-720.mp4',
          type: 'video/mp4',
          width: 1280,
          height: 720,
          groupIndex: 0,
        },
      ])
      const expected = html`
        <video
          src="https://example.com/clip-360.mp4"
          width="640"
          height="360"
          controls
          data-enclosure=""
        ></video>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should fold an ungrouped enclosure naming a group member into the group', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/clip-720.mp4', type: 'video/mp4' },
        {
          url: 'https://example.com/clip-720.mp4',
          type: 'video/mp4',
          height: 720,
          groupIndex: 0,
        },
        {
          url: 'https://example.com/clip-1080.mp4',
          type: 'video/mp4',
          height: 1080,
          isDefault: true,
          groupIndex: 0,
        },
      ])
      const expected = html`
        <video
          src="https://example.com/clip-1080.mp4"
          height="1080"
          controls
          data-enclosure=""
        ></video>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should fold an ungrouped enclosure listed after its group member', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        {
          url: 'https://example.com/clip-720.mp4',
          type: 'video/mp4',
          height: 720,
          groupIndex: 0,
        },
        {
          url: 'https://example.com/clip-1080.mp4',
          type: 'video/mp4',
          height: 1080,
          isDefault: true,
          groupIndex: 0,
        },
        { url: 'https://example.com/clip-720.mp4', type: 'video/mp4' },
      ])
      const expected = html`
        <video
          src="https://example.com/clip-1080.mp4"
          height="1080"
          controls
          data-enclosure=""
        ></video>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should fold on the cleaned url', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([
          { url: 'https://example.com/clip-720.mp4?utm_source=feed', type: 'video/mp4' },
          {
            url: 'https://example.com/clip-720.mp4',
            type: 'video/mp4',
            height: 720,
            groupIndex: 0,
          },
          {
            url: 'https://example.com/clip-1080.mp4',
            type: 'video/mp4',
            height: 1080,
            isDefault: true,
            groupIndex: 0,
          },
        ]),
        cleanUrlFn: (url) => url.split('?')[0],
      }
      const expected = html`
        <video
          src="https://example.com/clip-1080.mp4"
          height="1080"
          controls
          data-enclosure=""
        ></video>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should inject nothing for a group whose renditions have no url', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { type: 'video/mp4', height: 720, groupIndex: 0 },
        { type: 'video/mp4', height: 1080, isDefault: true, groupIndex: 0 },
      ])

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should inject a group where its first rendition stood', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        {
          url: 'https://example.com/clip-720.mp4',
          type: 'video/mp4',
          height: 720,
          groupIndex: 0,
        },
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
        {
          url: 'https://example.com/clip-1080.mp4',
          type: 'video/mp4',
          height: 1080,
          groupIndex: 0,
        },
      ])
      const expected = html`
        <video
          src="https://example.com/clip-720.mp4"
          height="720"
          controls
          data-enclosure=""
        ></video>
        <audio
          src="https://example.com/episode.mp3"
          controls
          data-enclosure=""
        ></audio>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })

  describe('equal sources', () => {
    it('should inject one placeholder when two enclosures name the same player', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        {
          url: 'https://example.com/download/clip.mp4',
          type: 'video/mp4',
          playerUrl: 'https://example.com/videos/embed/clip',
        },
        {
          url: 'https://example.com/streams/clip-2160.mp4',
          type: 'video/mp4',
          height: 2160,
          playerUrl: 'https://example.com/videos/embed/clip',
        },
      ])
      const expected = html`
        <div
          data-embed-src="https://example.com/videos/embed/clip"
          data-enclosure=""
        ></div>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should inject one element when two enclosures name the same file', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg', duration: 1935 },
      ])
      const expected = html`
        <audio
          src="https://example.com/episode.mp3"
          controls
          data-enclosure=""
        ></audio>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should inject one element when two enclosures differ only by a tracking parameter', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([
          { url: 'https://example.com/episode.mp3?utm_source=feed', type: 'audio/mpeg' },
          { url: 'https://example.com/episode.mp3?utm_source=web', type: 'audio/mpeg' },
        ]),
        cleanUrlFn: (url) => url.split('?')[0],
      }
      const expected = html`
        <audio
          src="https://example.com/episode.mp3?utm_source=feed"
          controls
          data-enclosure=""
        ></audio>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should keep two players that name different files', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://example.com/clip-a.mp4', type: 'video/mp4' },
        { url: 'https://example.com/clip-b.mp4', type: 'video/mp4' },
      ])
      const expected = html`
        <video
          src="https://example.com/clip-a.mp4"
          controls
          data-enclosure=""
        ></video>
        <video
          src="https://example.com/clip-b.mp4"
          controls
          data-enclosure=""
        ></video>
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })

  it('should skip enclosures without type or medium', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/file.bin' }])

    expect(await transform(value, context)).toEqualHtml(value)
  })

  it('should inject multiple enclosures', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
      { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
    ])
    const expected = html`
      <audio
        src="https://example.com/episode.mp3"
        controls
        data-enclosure=""
      ></audio>
      <video
        src="https://example.com/clip.mp4"
        controls
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should detect audio by medium field', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/episode.mp3', medium: 'audio' }])
    const expected = html`
      <audio
        src="https://example.com/episode.mp3"
        controls
        data-enclosure=""
      ></audio>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should detect video by medium field', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/clip.mp4', medium: 'video' }])
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should do nothing when no enclosures', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should do nothing when enclosures is empty', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value, withEnclosures([]))).toEqualHtml(value)
  })

  it('should resolve enclosure with unrecognized type through resolver', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://www.youtube.com/v/dQw4w9WgXcQ', type: 'application/x-shockwave-flash' },
      ]),
    )

    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-enclosure=""
      ></div>
      <p>Content</p>
    `

    expect(result).toEqualHtml(expected)
  })

  it('should use resolver type over enclosure medium', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' },
    ])
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-enclosure=""
      ></div>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should skip enclosure with unrecognized type and no resolver match', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      { url: 'https://example.com/widget.swf', type: 'application/x-shockwave-flash' },
    ])

    expect(await transform(value, context)).toEqualHtml(value)
  })

  it('should skip enclosure with javascript: url', async () => {
    const value = '<p>Content</p>'

    const result = await transform(
      value,
      withEnclosures([{ url: 'javascript:alert(1)', medium: 'video' }]),
    )

    expect(result).toEqualHtml(value)
  })

  it('should skip enclosure with data: url', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'data:text/html,<script>1</script>', medium: 'video' }])

    expect(await transform(value, context)).toEqualHtml(value)
  })

  it('should inject a relative enclosure url when baseUrl resolves it', async () => {
    const value = '<p>Content</p>'
    const context = {
      ...withEnclosures([{ url: '/clip.mp4', type: 'video/mp4' }]),
      baseUrl: 'https://example.com',
    }
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should resolve a relative poster against the base url', async () => {
    const value = '<p>Content</p>'
    const context = {
      ...withEnclosures([
        {
          url: 'https://example.com/clip.mp4',
          type: 'video/mp4',
          thumbnails: [{ url: '/thumb.jpg' }],
        },
      ]),
      baseUrl: 'https://example.com',
    }
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        poster="https://example.com/thumb.jpg"
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should skip a relative enclosure url when baseUrl is missing', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: '/clip.mp4', type: 'video/mp4' }])

    expect(await transform(value, context)).toEqualHtml(value)
  })

  it('should emit width and height on video enclosure when provided', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      { url: 'https://example.com/clip.mp4', type: 'video/mp4', width: 1280, height: 720 },
    ])
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        width="1280"
        height="720"
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should emit poster on video enclosure from first thumbnail', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      {
        url: 'https://example.com/clip.mp4',
        type: 'video/mp4',
        thumbnails: [
          { url: 'https://example.com/poster-large.jpg', width: 1280, height: 720 },
          { url: 'https://example.com/poster-small.jpg' },
        ],
      },
    ])
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        poster="https://example.com/poster-large.jpg"
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should not emit poster when thumbnails is an empty array', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      { url: 'https://example.com/clip.mp4', type: 'video/mp4', thumbnails: [] },
    ])
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should leave an unsafe poster for neutralizeUnsafeUrls to handle downstream', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      {
        url: 'https://example.com/clip.mp4',
        type: 'video/mp4',
        thumbnails: [{ url: 'javascript:alert(1)' }],
      },
    ])
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        poster="about:blank"
        data-enclosure=""
      ></video>
      <p>Content</p>
    `
    const result = await applyDomTransforms(parseHtml(value), [
      injectEnclosures(context),
      neutralizeUnsafeUrls(context),
    ])

    expect(result).toEqualHtml(expected)
  })

  it('should not emit width, height, or poster on audio enclosure', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([
      {
        url: 'https://example.com/episode.mp3',
        type: 'audio/mpeg',
        width: 1280,
        height: 720,
        thumbnails: [{ url: 'https://example.com/cover.jpg' }],
      },
    ])
    const expected = html`
      <audio
        src="https://example.com/episode.mp3"
        controls
        data-enclosure=""
      ></audio>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should not emit width or height on video enclosure when missing', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }])
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        data-enclosure=""
      ></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  // Untrusted feed data doesn't honor the required-`url` type.
  it('should skip an enclosure without a url instead of throwing', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(value, withEnclosures([{ type: 'image/png' } as Enclosure]))

    expect(result).toEqualHtml(value)
  })

  it('should skip a malformed enclosure while still injecting valid ones', async () => {
    const value = '<p>Episode notes</p>'
    const context = withEnclosures([
      { type: 'image/png' } as Enclosure,
      { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
    ])
    const expected = html`
      <audio
        src="https://example.com/episode.mp3"
        controls
        data-enclosure=""
      ></audio>
      <p>Episode notes</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = '<p>Episode notes</p>'
    const context = withEnclosures([
      { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
      { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' },
    ])
    const once = await transform(value, context)
    const twice = await transform(once, context)

    expect(twice).toEqualHtml(once)
  })
})
