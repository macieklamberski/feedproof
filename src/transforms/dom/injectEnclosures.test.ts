import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { youtubeEmbedResolver } from '../../embeds/youtube.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { Enclosure, TransformContext } from '../../types.js'
import { injectEnclosures } from './injectEnclosures.js'
import { neutralizeUnsafeUrls } from './neutralizeUnsafeUrls.js'

const withResolver: TransformContext = {
  ...baseContext,
  embedResolvers: [youtubeEmbedResolver],
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

  it('should skip enclosures already present in content', async () => {
    const value = html`
      <p>Content</p>
      <video src="https://example.com/clip.mp4"></video>
    `
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }]),
    )
    const matches = result.match(/example\.com\/clip\.mp4/g)

    expect(matches).toHaveLength(1)
  })

  it('should skip enclosure matching an inline source after cleanUrlFn strips its query', async () => {
    const value = html`
      <p>Content</p>
      <video><source src="https://example.com/clip.mp4?_=2"></video>
    `
    const context: TransformContext = {
      ...withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }]),
      cleanUrlFn: (url) => url.split('?')[0],
    }
    const result = await transform(value, context)
    const matches = result.match(/example\.com\/clip\.mp4/g)

    expect(matches).toHaveLength(1)
  })

  describe('image enclosures', () => {
    it('should inject image enclosure as img element', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])
      const expected = html`
        <img src="https://example.com/photo.jpg">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should detect image by medium field', async () => {
      const value = '<p>Content</p>'
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', medium: 'image' }])
      const expected = html`
        <img src="https://example.com/photo.jpg">
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
        <img src="https://example.com/one.jpg">
        <img src="https://example.com/two.jpg">
        <p>Content</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should skip image enclosure already present in content', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/photo.jpg">
      `
      const context = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])
      const result = await transform(value, context)
      const matches = result.match(/example\.com\/photo\.jpg/g)

      expect(matches).toHaveLength(1)
    })

    it('should skip image enclosure that differs from inline image only by query', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/a/photo.png">
      `
      const context = withEnclosures([
        { url: 'https://example.com/a/photo.png?w=1024', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).not.toContain('?w=1024')
    })

    it('should skip image enclosure that is a dimension-only crop of an inline image', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/news/group/wide__148x84">
      `
      const context = withEnclosures([
        { url: 'https://example.com/news/group/original__640x360', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).not.toContain('original__640x360')
    })

    it('should skip image enclosure that is a size-keyword variant of an inline image', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/photos/123/456/large.jpg">
      `
      const context = withEnclosures([
        { url: 'https://example.com/photos/123/456/small.jpg', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).not.toContain('small.jpg')
    })

    it('should skip image enclosure that is a WordPress sized copy of an inline image', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/uploads/photo-800x450.jpg">
      `
      const context = withEnclosures([
        { url: 'https://example.com/uploads/photo.jpg', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).not.toContain(
        'src="https://example.com/uploads/photo.jpg"',
      )
    })

    it('should still inject an image enclosure that is a genuinely different image', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/photos/123/456/large.jpg">
      `
      const context = withEnclosures([
        { url: 'https://example.com/photos/999/888/large.jpg', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).toContain('photos/999/888/large.jpg')
    })

    it('should not collapse unrelated root-level size-keyword files', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/large.jpg">
      `
      const context = withEnclosures([{ url: 'https://example.com/small.jpg', type: 'image/jpeg' }])

      expect(await transform(value, context)).toContain('small.jpg')
    })

    it('should skip image enclosure that differs from inline image only by www', async () => {
      const value = html`
        <p>Content</p>
        <img src="http://example.com/news/thumb.jpg">
      `
      const context = withEnclosures([
        { url: 'http://www.example.com/news/thumb.jpg', type: 'image/jpeg' },
      ])

      expect(await transform(value, context)).not.toContain('www.example.com')
    })

    it('should skip image enclosure that differs from inline image only by protocol', async () => {
      const value = html`
        <p>Content</p>
        <img src="http://example.com/news/thumb.jpg">
      `
      const context = withEnclosures([
        { url: 'https://example.com/news/thumb.jpg', type: 'image/jpeg' },
      ])
      const result = await transform(value, context)

      expect(result.match(/example\.com\/news\/thumb\.jpg/g)).toHaveLength(1)
    })

    it('should skip image enclosure that differs from inline image only by host case', async () => {
      const value = html`
        <p>Content</p>
        <img src="https://example.com/news/thumb.jpg">
      `
      const context = withEnclosures([
        { url: 'https://Example.COM/news/thumb.jpg', type: 'image/jpeg' },
      ])
      const result = await transform(value, context)

      expect(result.match(/example\.com\/news\/thumb\.jpg/gi)).toHaveLength(1)
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
        <img src="https://example.com/photo.jpg" width="800" height="600" alt="A photo">
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
      <audio src="https://example.com/episode.mp3" controls preload="none"></audio>
      <p>Content</p>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should detect video by medium field', async () => {
    const value = '<p>Content</p>'
    const context = withEnclosures([{ url: 'https://example.com/clip.mp4', medium: 'video' }])
    const expected = html`
      <video src="https://example.com/clip.mp4" controls preload="none"></video>
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
      >
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        >https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>
      </div>
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
      <video src="https://example.com/clip.mp4" controls preload="none"></video>
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
      <video src="https://example.com/clip.mp4" controls preload="none"></video>
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

  it('should be idempotent', async () => {
    const value = '<p>Episode notes</p>'
    const enclosures: Array<Enclosure> = [
      { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
    ]
    const once = await transform(value, withEnclosures(enclosures))
    const twice = await transform(once, withEnclosures(enclosures))

    expect(twice).toBe(once)
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
})
