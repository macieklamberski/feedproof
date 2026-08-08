import { describe, expect, it } from 'bun:test'
import { defaultWidgetResolvers } from '../../defaults.js'
import { youtubeEmbedResolver } from '../../embeds/youtube.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { EmbedResolver, MediaResolver, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertWidgets } from './convertWidgets.js'

const stubResolver: EmbedResolver = {
  selector: 'iframe[src*="example.com"]',
  extract: (element) => ({
    provider: 'example',
    src: element.getAttribute('src') ?? '',
  }),
}

const withResolvers: TransformContext = {
  ...baseContext,
  widgetResolvers: [youtubeEmbedResolver, stubResolver],
}

const withNoResolvers: TransformContext = {
  ...baseContext,
  widgetResolvers: [],
}

describeForEachParser('convertWidgets', (parseHtml) => {
  const transform = (html: string, context: TransformContext = withResolvers) => {
    return applyDomTransforms(parseHtml(html), [convertWidgets(context)])
  }

  it('should replace iframe with rich-metadata placeholder when handler returns metadata', async () => {
    const value = html`
      <p>Text</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `
    const result = await transform(value)

    expect(result).toContain('data-embed-src=')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
    expect(result).toContain('data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
    expect(result).toContain('data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    expect(result).toContain(
      'data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"',
    )
    expect(result).not.toContain('<iframe')
  })

  it('should prefer a carried data-thumbnail over the resolver thumbnail', async () => {
    const value = html`
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
      ></iframe>
    `
    const result = await transform(value)

    expect(result).toContain(
      'data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"',
    )
    expect(result).not.toContain('hqdefault')
  })

  it('should include fallback link with canonical url', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = await transform(value)

    expect(result).toContain('<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">')
    expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>')
  })

  it('should preserve iframe dimensions as data attributes', async () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640" height="360"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should recover aspect from a responsive wrapper when the iframe is unsized', async () => {
    const value =
      '<div style="padding-bottom:56.25%"><iframe src="https://example.com/embed/xyz"></iframe></div>'
    const result = await transform(value, withNoResolvers)

    expect(result).toContain('data-embed-width="100"')
    expect(result).toContain('data-embed-height="56"')
  })

  it('should recover aspect from a wp-embed-aspect class on an ancestor', async () => {
    const value =
      '<figure class="wp-block-embed wp-embed-aspect-16-9"><div class="wp-block-embed__wrapper"><iframe src="https://example.com/embed/xyz"></iframe></div></figure>'
    const result = await transform(value, withNoResolvers)

    // 16:9 encoded as a 100×N ratio (100 / (16/9) = 56.25 -> 56).
    expect(result).toContain('data-embed-width="100"')
    expect(result).toContain('data-embed-height="56"')
  })

  it('should not recover aspect from out-of-range wrapper values', async () => {
    const value =
      '<figure class="wp-embed-aspect-0-0"><div style="padding-bottom:0%"><iframe src="https://example.com/embed/xyz"></iframe></div></figure>'
    const result = await transform(value, withNoResolvers)

    expect(result).not.toContain('data-embed-width')
    expect(result).not.toContain('data-embed-height')
  })

  it('should fall back to resolver metadata dimensions when the iframe has none', async () => {
    const sizedResolver: EmbedResolver = {
      selector: 'iframe[src*="example.com"]',
      extract: (element) => ({
        provider: 'example',
        src: element.getAttribute('src') ?? '',
        width: 480,
        height: 270,
      }),
    }
    const customContext: TransformContext = { ...baseContext, widgetResolvers: [sizedResolver] }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const expected = html`
      <div
        data-embed-provider="example"
        data-embed-src="https://example.com/player/xyz"
        data-embed-width="480"
        data-embed-height="270"
      >
        <a href="https://example.com/player/xyz">https://example.com/player/xyz</a>
      </div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should support a resolver with a promise-returning extract', async () => {
    const asyncResolver: EmbedResolver = {
      selector: 'iframe[src*="example.com"]',
      extract: (element) =>
        Promise.resolve({
          provider: 'async',
          src: element.getAttribute('src') ?? '',
        }),
    }
    const customContext: TransformContext = { ...baseContext, widgetResolvers: [asyncResolver] }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const expected = html`
      <div data-embed-provider="async" data-embed-src="https://example.com/player/xyz">
        <a href="https://example.com/player/xyz">https://example.com/player/xyz</a>
      </div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should replace multiple embeds in same content', async () => {
    const value = html`
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      <iframe src="https://example.com/player/xyz"></iframe>
    `
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-provider="example"')
  })

  it('should preserve surrounding content when replacing media', async () => {
    const value = html`
      <p>Before</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      <p>After</p>
    `
    const result = await transform(value)

    expect(result).toContain('Before')
    expect(result).toContain('After')
    expect(result).toContain('data-embed-src=')
  })

  it('should emit data-embed-title, description, author, avatar and duration when handler returns them', async () => {
    const customResolver: EmbedResolver = {
      selector: 'iframe[src*="example.com"]',
      extract: (element) => ({
        provider: 'example',
        src: element.getAttribute('src') ?? '',
        title: 'Sample title',
        description: 'Sample description',
        author: '@user',
        avatar: 'https://example.com/avatar.jpg',
        duration: 125,
      }),
    }
    const customContext: TransformContext = { ...baseContext, widgetResolvers: [customResolver] }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = await transform(value, customContext)

    expect(result).toContain('data-embed-title="Sample title"')
    expect(result).toContain('data-embed-description="Sample description"')
    expect(result).toContain('data-embed-author="@user"')
    expect(result).toContain('data-embed-avatar="https://example.com/avatar.jpg"')
    expect(result).toContain('data-embed-duration="125"')
  })

  // URL safety is neutralizeUnsafeUrls' job (see its tests); this transform only
  // emits the placeholder, so an unsafe avatar passes through here unchanged.
  it('should pass an unsafe avatar url through unchanged', async () => {
    const customResolver: EmbedResolver = {
      selector: 'iframe[src*="example.com"]',
      extract: (element) => ({
        provider: 'example',
        src: element.getAttribute('src') ?? '',
        avatar: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = { ...baseContext, widgetResolvers: [customResolver] }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = await transform(value, customContext)

    expect(result).toContain('data-embed-avatar="javascript:alert(1)"')
  })

  it('should wrap unknown iframe as generic placeholder without provider', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed-src=')
    expect(result).toContain('data-embed-src="https://unknown-site.com/123"')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should preserve dimensions when wrapping unknown iframe', async () => {
    const value = '<iframe src="https://unknown-site.com/123" width="640" height="360"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should wrap every generic iframe when several are adjacent', async () => {
    const value = html`
      <iframe src="https://a-site.com/1"></iframe>
      <iframe src="https://b-site.com/2"></iframe>
      <iframe src="https://c-site.com/3"></iframe>
    `
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result.match(/data-embed-src=/g)).toHaveLength(3)
  })

  it('should include fallback link when wrapping unknown iframe', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = await transform(value)

    expect(result).toContain(
      '<a href="https://unknown-site.com/123">https://unknown-site.com/123</a>',
    )
  })

  it('should skip iframe without src attribute', async () => {
    const value = '<iframe></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('data-embed')
    expect(result).toContain('<iframe')
  })

  it('should still wrap unknown iframes when widgetResolvers is empty', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = await transform(value, withNoResolvers)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed-src=')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should leave video elements untouched', async () => {
    const value = '<video src="https://example.com/clip.mp4"></video>'
    const result = await transform(value)

    expect(result).toContain('<video')
    expect(result).not.toContain('data-embed')
  })

  it('should leave audio elements untouched', async () => {
    const value = '<audio src="https://example.com/episode.mp3"></audio>'
    const result = await transform(value)

    expect(result).toContain('<audio')
    expect(result).not.toContain('data-embed')
  })

  it('should skip iframe with malformed src url', async () => {
    const value = '<iframe src="not-a-valid-url"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('data-embed')
    expect(result).toContain('<iframe')
  })

  it('should skip iframe with non-http(s) src', async () => {
    const value = '<iframe src="javascript:alert(1)"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('data-embed')
  })

  it('should fall through to next handler when first returns undefined', async () => {
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-provider="example"')
  })

  it('should resolve YouTube via defaultWidgetResolvers export', async () => {
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: defaultWidgetResolvers,
    }
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = await transform(value, customContext)

    expect(result).toContain('data-embed-provider="youtube"')
  })

  it('should skip resolver-claimed iframe when metadata.src is unsafe', async () => {
    const unsafeResolver: EmbedResolver = {
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'evil',
        src: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = { ...baseContext, widgetResolvers: [unsafeResolver] }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const result = await transform(value, customContext)

    expect(result).not.toContain('data-embed-provider="evil"')
    expect(result).not.toContain('javascript:')
  })

  it('should skip resolver-claimed iframe when metadata.url is unsafe', async () => {
    const unsafeResolver: EmbedResolver = {
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'evil',
        src: 'https://example.com/x',
        url: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = { ...baseContext, widgetResolvers: [unsafeResolver] }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const result = await transform(value, customContext)

    expect(result).not.toContain('data-embed-provider="evil"')
    expect(result).not.toContain('javascript:')
  })

  it('should let consumer override resolveUrlFn to allow non-default schemes', async () => {
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [],
      resolveUrlFn: (url) => url,
    }
    const value = '<iframe src="custom-scheme://payload"></iframe>'
    const result = await transform(value, customContext)

    expect(result).toContain('data-embed-src="custom-scheme://payload"')
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>Text</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  describe('non-iframe carriers', () => {
    it('should replace an <object data> carrier with a placeholder', async () => {
      const value = '<object data="https://example.com/v/x"></object>'
      const result = await transform(value, withNoResolvers)

      expect(result).toContain('data-embed-src="https://example.com/v/x"')
      expect(result).not.toContain('<object')
    })

    it('should replace an <embed src> carrier with a placeholder', async () => {
      const value = '<embed src="https://example.com/e/x">'
      const result = await transform(value, withNoResolvers)

      expect(result).toContain('data-embed-src="https://example.com/e/x"')
      expect(result).not.toContain('<embed')
    })

    it('should clean a generic iframe src with the provided cleanUrlFn', async () => {
      const context: TransformContext = {
        ...withNoResolvers,
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const value = '<iframe src="https://widget.example.com/thing?utm_source=feed"></iframe>'
      const result = await transform(value, context)

      expect(result).toContain('data-embed-src="https://widget.example.com/thing"')
      expect(result).toContain('<a href="https://widget.example.com/thing">')
    })

    it('should clean a non-iframe carrier src with the provided cleanUrlFn', async () => {
      const context: TransformContext = {
        ...withNoResolvers,
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const value = '<object data="https://example.com/v/x?utm_source=feed"></object>'
      const result = await transform(value, context)

      expect(result).toContain('data-embed-src="https://example.com/v/x"')
    })

    it('should leave an empty iframe with no recoverable content', async () => {
      const value = '<iframe src="about:blank"></iframe>'
      const result = await transform(value, withNoResolvers)

      expect(result).toContain('<iframe')
    })
  })
})

const uploadId = 'de58e4a3-5505-45a7-8abc-b46c5c0f6e7a'
const uploadSrc = `https://api.substack.com/api/v1/video/upload/${uploadId}/src`

describeForEachParser('convertWidgets (media results)', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [convertWidgets(context)])
  }

  const withResolver = (resolver: MediaResolver): TransformContext => {
    return { ...baseContext, widgetResolvers: [resolver] }
  }

  // The two parsers order attributes differently and serialize `controls` with and without
  // a value, so each piece is asserted on its own rather than as one rendered tag.
  it('should replace a container with a video element carrying controls', async () => {
    const value = `<div class="native-video-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>`
    const result = await transform(value)

    expect(result).toContain('<video')
    expect(result).toContain(`src="${uploadSrc}"`)
    expect(result).toContain('controls')
    expect(result).not.toContain('native-video-embed')
  })

  it('should replace an audio container with an audio element', async () => {
    const value = `<div class="native-audio-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>`
    const result = await transform(value)

    expect(result).toContain('<audio')
    expect(result).not.toContain('<video')
  })

  it('should leave a container its resolver rejects', async () => {
    const value = '<div class="native-video-embed"></div>'
    const result = await transform(value)

    expect(result).toContain('native-video-embed')
    expect(result).not.toContain('<video')
  })

  it('should run media and embed resolvers from the one array', async () => {
    const value = html`
      <div class="native-video-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `
    const result = await transform(value)

    expect(result).toContain(`src="${uploadSrc}"`)
    expect(result).toContain('data-embed-provider="youtube"')
  })

  it('should write a poster onto a video', async () => {
    const posterResolver: MediaResolver = {
      selector: '.poster-embed',
      extract: () => ({
        tag: 'video',
        src: 'https://example.com/clip.mp4',
        poster: 'https://example.com/still.jpg',
      }),
    }
    const value = '<div class="poster-embed"></div>'
    const result = await transform(value, withResolver(posterResolver))

    expect(result).toContain('poster="https://example.com/still.jpg"')
  })

  it('should not write a poster onto an audio element', async () => {
    const posterResolver: MediaResolver = {
      selector: '.poster-embed',
      extract: () => ({
        tag: 'audio',
        src: 'https://example.com/track.mp3',
        poster: 'https://example.com/still.jpg',
      }),
    }
    const value = '<div class="poster-embed"></div>'
    const result = await transform(value, withResolver(posterResolver))

    expect(result).toContain('<audio')
    expect(result).not.toContain('poster')
  })

  it('should await an async media resolver', async () => {
    const asyncResolver: MediaResolver = {
      selector: '.async-embed',
      extract: async () => ({ tag: 'video', src: 'https://example.com/clip.mp4' }),
    }
    const value = '<div class="async-embed"></div>'
    const result = await transform(value, withResolver(asyncResolver))

    expect(result).toContain('<video')
    expect(result).toContain('https://example.com/clip.mp4')
  })

  it('should be idempotent', async () => {
    const value = `<div class="native-video-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  describe('bare media files framed as embeds', () => {
    it('should play an iframe framing a video file as a video element', async () => {
      const value =
        '<iframe src="https://cdn.example.com/clip.mp4" width="640" height="360"></iframe>'
      const result = await transform(value)

      expect(result).toContain('<video')
      expect(result).toContain('src="https://cdn.example.com/clip.mp4"')
      expect(result).not.toContain('data-embed-src')
    })

    it('should play an object framing an audio file as an audio element', async () => {
      const value = '<object data="https://cdn.example.com/ep.mp3"></object>'
      const result = await transform(value)

      expect(result).toContain('<audio')
      expect(result).not.toContain('data-embed-src')
    })

    // A manifest plays natively only in Safari, so it stays an embed placeholder.
    it('should keep a streaming manifest as a placeholder', async () => {
      const value = '<iframe src="https://stream.example.com/live/index.m3u8"></iframe>'
      const result = await transform(value)

      expect(result).toContain('data-embed-src')
      expect(result).not.toContain('<video')
    })
  })

  describe('containers parking a media url in an attribute', () => {
    it('should convert a Discourse video placeholder', async () => {
      const value =
        '<div class="video-placeholder-container" data-video-src="https://cdn.example.com/clip.mp4"></div>'
      const result = await transform(value)

      expect(result).toContain('<video')
      expect(result).toContain('src="https://cdn.example.com/clip.mp4"')
    })

    it('should convert an audio url into an audio element', async () => {
      const value =
        '<div class="audiofield-wordpress-player" data-src="https://x.example/a.mp3"></div>'
      const result = await transform(value)

      expect(result).toContain('<audio')
      expect(result).toContain('src="https://x.example/a.mp3"')
      expect(result).not.toContain('<video')
    })

    it('should keep the container and its text, adding the media in front', async () => {
      const value = '<li data-audiopath="https://x.example/track.mp3">Track one</li>'
      const result = await transform(value)

      expect(result).toContain('<audio')
      expect(result).toContain('Track one')
    })

    it('should resolve a relative parked url against the base url', async () => {
      const value = '<div data-video-src="/uploads/clip.mp4"></div>'
      const result = await transform(value, {
        ...baseContext,
        baseUrl: 'https://forum.example/t/1',
      })

      expect(result).toContain('src="https://forum.example/uploads/clip.mp4"')
    })

    it('should skip a streaming manifest', async () => {
      const value = '<div data-video-src="https://x.example/index.m3u8"></div>'
      const result = await transform(value)

      expect(result).not.toContain('<video')
    })

    it('should skip a value that names an image', async () => {
      const value = '<div data-src="https://x.example/photo.jpg"></div>'
      const result = await transform(value)

      expect(result).not.toContain('<video')
      expect(result).not.toContain('<audio')
    })

    it('should skip a container that already wraps a player', async () => {
      const value =
        '<div data-src="https://x.example/a.mp3"><audio controls src="https://x.example/a.mp3"></audio></div>'
      const result = await transform(value)

      expect(result.match(/<audio/g)).toHaveLength(1)
    })

    it('should take the first attribute that names a media file', async () => {
      const value =
        '<div data-mp4="https://x.example/a.mp4" data-webm="https://x.example/a.webm"></div>'
      const result = await transform(value)

      expect(result).toContain('src="https://x.example/a.mp4"')
      expect(result).not.toContain('src="https://x.example/a.webm"')
    })

    it('should do nothing when no attributes are configured', async () => {
      const value = '<div data-video-src="https://x.example/clip.mp4"></div>'
      const result = await transform(value, { ...baseContext, mediaSrcAttributes: [] })

      expect(result).not.toContain('<video')
    })
  })
})
