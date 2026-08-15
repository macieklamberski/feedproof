import { describe, expect, it } from 'bun:test'
import { youtubeIframeEmbedResolver } from '../../embeds/youtube.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { Enclosure, TransformContext } from '../../types.js'
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
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [injectEnclosures(context)])
  }

  it('should inject video enclosure as native video element', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }]),
    )

    expect(result).toContain('<video')
    expect(result).toContain('src="https://example.com/clip.mp4"')
    expect(result).toContain(' controls')
    expect(result).toContain('preload="none"')
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
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }]),
    )

    expect(result).toContain('<audio')
    expect(result).toContain('src="https://example.com/episode.mp3"')
    expect(result).toContain(' controls')
    expect(result).toContain('preload="none"')
  })

  it('should resolve video enclosure through embedResolver', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' }]),
    )

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-thumbnail=')
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

    expect(result).toContain('data-embed-src="https://player.vimeo.com/video/76979871"')
    expect(result).toContain('data-embed-thumbnail="https://i.vimeocdn.com/video/76979871.jpg"')
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

    expect(result).toContain('data-embed-provider="youtube"')
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

    expect(result).toContain('data-embed-thumbnail="https://cdn.example.com/feed-thumb.jpg"')
    expect(result).not.toContain('hqdefault')
  })

  it('should keep the composed thumbnail when the feed provides none', async () => {
    const result = await transform(
      '<p>Notes</p>',
      withEnclosures([{ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' }]),
    )

    expect(result).toContain('hqdefault')
  })

  it('should carry the enclosure duration onto the embed', async () => {
    const result = await transform(
      '<p>Notes</p>',
      withEnclosures([
        { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video', duration: 212 },
      ]),
    )

    expect(result).toContain('data-embed-duration="212"')
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
      const result = await transform(
        value,
        withEnclosures([
          { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
          { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
        ]),
      )

      expect(result).toContain('<audio')
      expect(result).toContain('<img')
      expect(result).toContain('src="https://example.com/cover.jpg"')
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
      const context = {
        ...withEnclosures([{ url: '/photo.jpg', type: 'image/jpeg' }]),
        baseUrl: 'https://example.com',
      }
      const result = await transform('<p>Content</p>', context)

      expect(result).toContain('src="https://example.com/photo.jpg"')
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
        <picture><img src="https://example.com/inline.jpg"></picture>
      `
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should still inject audio and video enclosures when content has an image', async () => {
      const value = '<p>Content</p><img src="https://example.com/inline.jpg">'
      const result = await transform(
        value,
        withEnclosures([
          { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
          { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
          { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
        ]),
      )

      expect(result).toContain('<audio')
      expect(result).toContain('<video')
      expect(result).not.toContain('cover.jpg')
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

    it('should inject the gravatar avatar when avatarImageHosts is empty', async () => {
      const value = '<p>Content</p>'
      const context: TransformContext = {
        ...withEnclosures([{ url: 'https://2.gravatar.com/avatar/abc123', type: 'image/jpeg' }]),
        avatarImageHosts: [],
      }
      const expected = html`
        <img src="https://2.gravatar.com/avatar/abc123" data-enclosure="">
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
      const result = await transform(value, context)

      expect(result).toContain('cover.jpg?w=900')
      expect(result).not.toContain('cover.jpg?w=300')
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

    it('should not merge a file entry into a player page with a different nested url', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([
        { url: 'https://player.example.com/?media_url=https%3A%2F%2Fexample.com%2Fother.mp3' },
        { url: 'https://example.com/ep.mp3', type: 'audio/mpeg' },
      ])
      const expected = html`
        <audio src="https://example.com/ep.mp3" controls preload="none" data-enclosure=""></audio>
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
        <audio src="https://example.com/ep.mp3" controls preload="none" data-enclosure=""></audio>
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

  it('should skip enclosures without type or medium', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/file.bin' }])

    expect(await transform(value, context)).toEqualHtml(value)
  })

  it('should inject multiple enclosures', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
        { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
      ]),
    )

    expect(result).toContain('<audio')
    expect(result).toContain('<video')
  })

  it('should detect audio by medium field', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/episode.mp3', medium: 'audio' }])
    const expected = html`
      <audio src="https://example.com/episode.mp3" controls preload="none" data-enclosure=""></audio>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should detect video by medium field', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/clip.mp4', medium: 'video' }])
    const expected = html`
      <video src="https://example.com/clip.mp4" controls preload="none" data-enclosure=""></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should do nothing when no enclosures', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value)).not.toContain('data-embed')
  })

  it('should do nothing when enclosures is empty', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value, withEnclosures([]))).not.toContain('data-embed')
  })

  it('should resolve enclosure with unrecognized type through resolver', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://www.youtube.com/v/dQw4w9WgXcQ', type: 'application/x-shockwave-flash' },
      ]),
    )

    expect(result).toContain('data-embed-src=')
    expect(result).toContain('data-embed-provider="youtube"')
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

    expect(result).not.toContain('data-embed')
    expect(result).not.toContain('javascript:')
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
      <video src="https://example.com/clip.mp4" controls preload="none" data-enclosure=""></video>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should resolve a relative poster against the base url', async () => {
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
    const result = await transform('<p>Content</p>', context)

    expect(result).toContain('poster="https://example.com/thumb.jpg"')
  })

  it('should skip a relative enclosure url when baseUrl is missing', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: '/clip.mp4', type: 'video/mp4' }])

    expect(await transform(value, context)).toEqualHtml(value)
  })

  it('should emit width and height on video enclosure when provided', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://example.com/clip.mp4', type: 'video/mp4', width: 1280, height: 720 },
      ]),
    )

    expect(result).toContain('width="1280"')
    expect(result).toContain('height="720"')
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
        preload="none"
        poster="https://example.com/poster-large.jpg"
        data-enclosure=""
      >
      </video>
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
      <video src="https://example.com/clip.mp4" controls preload="none" data-enclosure=""></video>
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
    const result = await applyDomTransforms(parseHtml(value), [
      injectEnclosures(context),
      neutralizeUnsafeUrls(context),
    ])

    expect(result).toContain('poster="about:blank"')
    expect(result).not.toContain('javascript:')
  })

  it('should not emit width, height, or poster on audio enclosure', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        {
          url: 'https://example.com/episode.mp3',
          type: 'audio/mpeg',
          width: 1280,
          height: 720,
          thumbnails: [{ url: 'https://example.com/cover.jpg' }],
        },
      ]),
    )

    expect(result).toContain('<audio')
    expect(result).not.toContain('width=')
    expect(result).not.toContain('height=')
    expect(result).not.toContain('poster=')
  })

  it('should not emit width or height on video enclosure when missing', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }]),
    )

    expect(result).toContain('<video')
    expect(result).not.toContain('width=')
    expect(result).not.toContain('height=')
    expect(result).not.toContain('poster=')
  })

  // Untrusted feed data doesn't honor the required-`url` type.
  it('should skip an enclosure without a url instead of throwing', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(value, withEnclosures([{ type: 'image/png' } as Enclosure]))

    expect(result).toBe(value)
  })

  it('should skip a malformed enclosure while still injecting valid ones', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([
        { type: 'image/png' } as Enclosure,
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
      ]),
    )

    expect(result).toContain('src="https://example.com/episode.mp3"')
  })

  it('should be idempotent', async () => {
    const value = '<p>Episode notes</p>'
    const context = withEnclosures([
      { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
      { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' },
    ])
    const once = await transform(value, context)
    const twice = await transform(once, context)

    expect(twice).toBe(once)
  })
})
