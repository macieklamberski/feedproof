import { describe, expect, it } from 'bun:test'
import { defaultWidgetResolvers } from '../../defaults.js'
import { youtubeIframeEmbedResolver } from '../../embeds/youtube.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { EmbedResolver, MediaResolver, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertWidgets } from './convertWidgets.js'

const stubResolver: EmbedResolver = {
  kind: 'embed',
  selector: 'iframe[src*="example.com"]',
  extract: (element) => ({
    provider: 'example',
    src: element.getAttribute('src') ?? '',
  }),
}

const withResolvers: TransformContext = {
  ...baseContext,
  widgetResolvers: [youtubeIframeEmbedResolver, stubResolver],
}

const withNoResolvers: TransformContext = {
  ...baseContext,
  widgetResolvers: [],
}

describeForEachParser('convertWidgets', (parseHtml) => {
  const transform = (value: string, context: TransformContext = withResolvers) => {
    return applyDomTransforms(parseHtml(value), [convertWidgets(context)])
  }

  it('should replace iframe with rich-metadata placeholder when handler returns metadata', async () => {
    const value = html`
      <p>Text</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `
    const expected = html`
      <p>Text</p>
      <div
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should prefer a carried data-thumbnail over the resolver thumbnail', async () => {
    const value = html`
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should preserve iframe dimensions as data attributes', async () => {
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: defaultWidgetResolvers,
    }
    const value = html`
      <iframe
        src="https://player.vimeo.com/video/76979871"
        width="640"
        height="360"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-width="640"
        data-embed-url="https://vimeo.com/76979871"
        data-embed-src="https://player.vimeo.com/video/76979871"
        data-embed-provider="vimeo"
        data-embed-id="76979871"
        data-embed-height="360"
      ></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should recover aspect from a responsive wrapper when the iframe is unsized', async () => {
    const value = html`
      <div style="padding-bottom:56.25%">
        <iframe src="https://example.com/embed/xyz"></iframe>
      </div>
    `
    const expected = html`
      <div style="padding-bottom:56.25%">
        <div
          data-embed-src="https://example.com/embed/xyz"
          data-embed-ratio="100/56.25"
        ></div>
      </div>
    `
    const result = await transform(value, withNoResolvers)

    expect(result).toEqualHtml(expected)
  })

  it('should recover aspect from a wp-embed-aspect class on an ancestor', async () => {
    const value = html`
      <figure class="wp-block-embed wp-embed-aspect-16-9">
        <div class="wp-block-embed__wrapper">
          <iframe src="https://example.com/embed/xyz"></iframe>
        </div>
      </figure>
    `
    const result = await transform(value, withNoResolvers)

    const expected = html`
      <figure class="wp-block-embed wp-embed-aspect-16-9">
        <div class="wp-block-embed__wrapper">
          <div
            data-embed-src="https://example.com/embed/xyz"
            data-embed-ratio="16/9"
          ></div>
        </div>
      </figure>
    `

    expect(result).toEqualHtml(expected)
  })

  it('should not recover aspect from out-of-range wrapper values', async () => {
    const value = html`
      <figure class="wp-embed-aspect-0-0">
        <div style="padding-bottom:0%">
          <iframe src="https://example.com/embed/xyz"></iframe>
        </div>
      </figure>
    `
    const expected = html`
      <figure class="wp-embed-aspect-0-0">
        <div style="padding-bottom:0%">
          <div data-embed-src="https://example.com/embed/xyz"></div>
        </div>
      </figure>
    `
    const result = await transform(value, withNoResolvers)

    expect(result).toEqualHtml(expected)
  })

  it('should fall back to resolver metadata dimensions when the iframe has none', async () => {
    const sizedResolver: EmbedResolver = {
      kind: 'embed',
      selector: 'iframe[src*="example.com"]',
      extract: (element) => ({
        provider: 'example',
        src: element.getAttribute('src') ?? '',
        width: 480,
        height: 270,
      }),
    }
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [sizedResolver],
    }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const expected = html`
      <div
        data-embed-provider="example"
        data-embed-src="https://example.com/player/xyz"
        data-embed-width="480"
        data-embed-height="270"
      ></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should support a resolver with a promise-returning extract', async () => {
    const asyncResolver: EmbedResolver = {
      kind: 'embed',
      selector: 'iframe[src*="example.com"]',
      extract: (element) =>
        Promise.resolve({
          provider: 'async',
          src: element.getAttribute('src') ?? '',
        }),
    }
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [asyncResolver],
    }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const expected = html`
      <div
        data-embed-provider="async"
        data-embed-src="https://example.com/player/xyz"
      ></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should replace multiple embeds in same content', async () => {
    const value = html`
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      <iframe src="https://example.com/player/xyz"></iframe>
    `
    const expected = html`
      <div
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
      ></div>
      <div
        data-embed-src="https://example.com/player/xyz"
        data-embed-provider="example"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should preserve surrounding content when replacing media', async () => {
    const value = html`
      <p>Before</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      <p>After</p>
    `
    const expected = html`
      <p>Before</p>
      <div
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
      ></div>
      <p>After</p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should emit data-embed-title, description, author, avatar and duration when handler returns them', async () => {
    const customResolver: EmbedResolver = {
      kind: 'embed',
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
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [customResolver],
    }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const expected = html`
      <div
        data-embed-title="Sample title"
        data-embed-src="https://example.com/player/xyz"
        data-embed-provider="example"
        data-embed-duration="125"
        data-embed-description="Sample description"
        data-embed-avatar="https://example.com/avatar.jpg"
        data-embed-author="@user"
      ></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  // URL safety is neutralizeUnsafeUrls' job (see its tests); this transform only
  // emits the placeholder, so an unsafe avatar passes through here unchanged.
  it('should pass an unsafe avatar url through unchanged', async () => {
    const customResolver: EmbedResolver = {
      kind: 'embed',
      selector: 'iframe[src*="example.com"]',
      extract: (element) => ({
        provider: 'example',
        src: element.getAttribute('src') ?? '',
        avatar: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [customResolver],
    }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const expected = html`
      <div
        data-embed-src="https://example.com/player/xyz"
        data-embed-provider="example"
        data-embed-avatar="javascript:alert(1)"
      ></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should wrap an unknown iframe as an empty generic placeholder with no provider', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const expected = html`
      <div data-embed-src="https://unknown-site.com/123"></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should preserve dimensions when wrapping unknown iframe', async () => {
    const value = html`
      <iframe
        src="https://unknown-site.com/123"
        width="640"
        height="360"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-width="640"
        data-embed-src="https://unknown-site.com/123"
        data-embed-height="360"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // The rule is the carrier tier's, not a platform's: an unknown iframe gets it too. No player is
  // nine pixels tall, so a pair this small is the shape it spells however it is spelled.
  it('should wrap an unknown iframe stating a small pair as a ratio', async () => {
    const value = html`
      <iframe
        src="https://unknown-site.com/123"
        style="width: 16; height: 9;"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-ratio="16/9"
        data-embed-src="https://unknown-site.com/123"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // Above the ceiling the same spelling is a real box, or a forgotten unit on one.
  it('should wrap an unknown iframe stating a large pair as pixels', async () => {
    const value = html`
      <iframe
        src="https://unknown-site.com/123"
        style="width: 540; height: 300;"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-width="540"
        data-embed-src="https://unknown-site.com/123"
        data-embed-height="300"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should wrap every generic iframe when several are adjacent', async () => {
    const value = html`
      <iframe src="https://a-site.com/1"></iframe>
      <iframe src="https://b-site.com/2"></iframe>
      <iframe src="https://c-site.com/3"></iframe>
    `
    const expected = html`
      <div data-embed-src="https://a-site.com/1"></div>
      <div data-embed-src="https://b-site.com/2"></div>
      <div data-embed-src="https://c-site.com/3"></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should skip iframe without src attribute', async () => {
    const value = '<iframe></iframe>'
    expect(await transform(value)).toEqualHtml(value)
  })

  it('should still wrap unknown iframes when widgetResolvers is empty', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const expected = html`
      <div data-embed-src="https://unknown-site.com/123"></div>
    `
    const result = await transform(value, withNoResolvers)

    expect(result).toEqualHtml(expected)
  })

  it('should leave video elements untouched', async () => {
    const value = '<video src="https://example.com/clip.mp4"></video>'
    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave audio elements untouched', async () => {
    const value = '<audio src="https://example.com/episode.mp3"></audio>'
    expect(await transform(value)).toEqualHtml(value)
  })

  it('should skip iframe with malformed src url', async () => {
    const value = '<iframe src="not-a-valid-url"></iframe>'
    expect(await transform(value)).toEqualHtml(value)
  })

  it('should skip iframe with non-http(s) src', async () => {
    const value = '<iframe src="javascript:alert(1)"></iframe>'
    expect(await transform(value)).toEqualHtml(value)
  })

  it('should fall through to next handler when first returns undefined', async () => {
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const expected = html`
      <div
        data-embed-src="https://example.com/player/xyz"
        data-embed-provider="example"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve YouTube via defaultWidgetResolvers export', async () => {
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: defaultWidgetResolvers,
    }
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const expected = html`
      <div
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
      ></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should skip resolver-claimed iframe when metadata.src is unsafe', async () => {
    const unsafeResolver: EmbedResolver = {
      kind: 'embed',
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'evil',
        src: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [unsafeResolver],
    }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const expected = html`
      <div data-embed-src="https://example.com/x"></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  // The case the drop exists for, and the only one nothing else in the pipeline covers.
  // neutralizeUnsafeUrls judges schemes, so a bare path passes it untouched and the placeholder
  // ends up naming a page on the reader's own origin. What the resolver read about the embed
  // itself is not in question, so the placeholder is still built, just without the url.
  it('should drop a resolver url that resolves to nothing and keep the rest of the embed', async () => {
    const pathResolver: EmbedResolver = {
      kind: 'embed',
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'example',
        src: 'https://example.com/x',
        url: '/watch/123',
      }),
    }
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [pathResolver],
    }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const expected = html`
      <div
        data-embed-src="https://example.com/x"
        data-embed-provider="example"
      ></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should let consumer override resolveUrlFn to allow non-default schemes', async () => {
    const customContext: TransformContext = {
      ...baseContext,
      widgetResolvers: [],
      resolveUrlFn: (url) => url,
    }
    const value = '<iframe src="custom-scheme://payload"></iframe>'
    const expected = html`
      <div data-embed-src="custom-scheme://payload"></div>
    `

    expect(await transform(value, customContext)).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>Text</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  describe('non-iframe carriers', () => {
    it('should replace an <object data> carrier with a placeholder', async () => {
      const value = '<object data="https://example.com/v/x"></object>'
      const expected = html`
        <div data-embed-src="https://example.com/v/x"></div>
      `

      expect(await transform(value, withNoResolvers)).toEqualHtml(expected)
    })

    it('should replace an <embed src> carrier with a placeholder', async () => {
      const value = '<embed src="https://example.com/e/x">'
      const expected = html`
        <div data-embed-src="https://example.com/e/x"></div>
      `

      expect(await transform(value, withNoResolvers)).toEqualHtml(expected)
    })

    it('should clean a generic iframe src with the provided cleanUrlFn', async () => {
      const context: TransformContext = {
        ...withNoResolvers,
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const value = '<iframe src="https://widget.example.com/thing?utm_source=feed"></iframe>'
      const expected = html`
        <div data-embed-src="https://widget.example.com/thing"></div>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should clean a non-iframe carrier src with the provided cleanUrlFn', async () => {
      const context: TransformContext = {
        ...withNoResolvers,
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const value = '<object data="https://example.com/v/x?utm_source=feed"></object>'
      const expected = html`
        <div data-embed-src="https://example.com/v/x"></div>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    // A resolver that carries its url out of the markup rather than minting it from an id
    // hands over whatever the publisher pasted, so it is cleaned like every other url here.
    it('should clean a resolver url with the provided cleanUrlFn', async () => {
      const urlResolver: EmbedResolver = {
        kind: 'embed',
        selector: 'iframe[src*="example.com"]',
        extract: () => ({
          provider: 'example',
          src: 'https://example.com/e/x',
          url: 'https://example.com/watch/x?utm_source=feed',
        }),
      }
      const context: TransformContext = {
        ...baseContext,
        widgetResolvers: [urlResolver],
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const value = '<iframe src="https://example.com/e/x"></iframe>'
      const expected = html`
        <div
          data-embed-url="https://example.com/watch/x"
          data-embed-src="https://example.com/e/x"
          data-embed-provider="example"
        ></div>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    // Reading an empty answer as the cleaned url would leave the placeholder with no url to
    // honour, and the whole embed is dropped over that. The url handed to the cleaner stands.
    it('should keep the resolver url when the cleanUrlFn answers with nothing', async () => {
      const urlResolver: EmbedResolver = {
        kind: 'embed',
        selector: 'iframe[src*="example.com"]',
        extract: () => ({
          provider: 'example',
          src: 'https://example.com/e/x',
          url: 'https://example.com/watch/x',
        }),
      }
      const context: TransformContext = {
        ...baseContext,
        widgetResolvers: [urlResolver],
        cleanUrlFn: () => '',
      }
      const value = '<iframe src="https://example.com/e/x"></iframe>'
      const expected = html`
        <div
          data-embed-url="https://example.com/watch/x"
          data-embed-src="https://example.com/e/x"
          data-embed-provider="example"
        ></div>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should leave an empty iframe with no recoverable content', async () => {
      const value = '<iframe src="about:blank"></iframe>'

      expect(await transform(value, withNoResolvers)).toEqualHtml(value)
    })
  })

  // Flash has been unplayable in every browser since 2021, so a placeholder pointing at a
  // `.swf` is a click-to-load button for a file that can never run, and minting it would also
  // discard the object's fallback content. The carrier is left alone instead: a browser
  // renders an object's fallback children when it cannot run the object, and an allowlist
  // sanitizer that drops the shell keeps them the same way. The Flash resolvers run first and
  // still claim what they can repair.
  describe('dead Flash carriers', () => {
    it('should not frame an <embed> pointing at a .swf', async () => {
      const value = '<embed src="https://example.com/player.swf">'
      const expected = html`
        <embed src="https://example.com/player.swf"></embed>
      `

      expect(await transform(value, withNoResolvers)).toEqualHtml(expected)
    })

    it('should leave an object and the fallback it holds untouched', async () => {
      const value = html`
        <object width="400" height="300" data="https://example.com/player.swf">
          <param name="movie" value="https://example.com/player.swf" />
          <a href="https://example.com/watch/1">Watch the video</a>
        </object>
      `
      const expected = html`
        <object
          width="400"
          height="300"
          data="https://example.com/player.swf"
        >
          <param
            value="https://example.com/player.swf"
            name="movie"
          ></param>
          <a href="https://example.com/watch/1">Watch the video</a>
        </object>
      `

      expect(await transform(value, withNoResolvers)).toEqualHtml(expected)
    })

    it('should still frame a carrier whose path only mentions swf outside the extension', async () => {
      const value = '<embed src="https://example.com/swfobject/player.html">'
      const expected = html`
        <div data-embed-src="https://example.com/swfobject/player.html"></div>
      `

      expect(await transform(value, withNoResolvers)).toEqualHtml(expected)
    })

    // The ordering contract with the resolvers: a repairable Flash carrier is claimed before
    // this skip ever sees it, so only what nothing could repair stays raw.
    it('should let a resolver claim a repairable .swf before the skip', async () => {
      const value = html`
        <div id="__ss_6435157">
          <object id="__sse6435157" width="425" height="355">
            <embed
              src="https://static.slidesharecdn.com/swf/ssplayer2.swf?doc=deck"
              width="425"
              height="355"
            ></embed>
          </object>
        </div>
      `
      const expected = html`
        <div id="__ss_6435157">
          <div
            data-embed-width="425"
            data-embed-src="https://www.slideshare.net/slideshow/embed_code/6435157"
            data-embed-provider="slideshare"
            data-embed-id="6435157"
            data-embed-height="355"
          ></div>
        </div>
      `

      expect(await transform(value, baseContext)).toEqualHtml(expected)
    })

    it('should be idempotent', async () => {
      const value = '<p>Before</p><embed src="https://example.com/player.swf"><p>After</p>'
      const once = await transform(value, withNoResolvers)
      const twice = await transform(once, withNoResolvers)

      expect(twice).toEqualHtml(once)
    })
  })

  // A url-keyed resolver claims these before the provider-less fallback above sees them,
  // which is the difference between a placeholder holding a dead .swf link and a real one.
  describe('provider resolution on non-iframe carriers', () => {
    it('should resolve a provider from an <embed src> carrier', async () => {
      const value = html`
        <embed
          src="https://www.youtube.com/v/dQw4w9WgXcQ"
          width="425"
          height="350"
        >
      `
      const expected = html`
        <div
                    data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          data-embed-ratio="16/9"
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should resolve a provider from an <object data> carrier', async () => {
      const value = '<object data="https://www.youtube.com/v/dQw4w9WgXcQ"></object>'
      const expected = html`
        <div
          data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          data-embed-ratio="16/9"
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should emit one placeholder for an <object> wrapping an <embed>', async () => {
      const value = html`
        <object data="https://www.youtube.com/v/dQw4w9WgXcQ">
          <embed src="https://www.youtube.com/v/dQw4w9WgXcQ" />
        </object>
      `
      const expected = html`
        <div
          data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          data-embed-ratio="16/9"
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read the Flash parameter form that carries no question mark', async () => {
      const value = '<embed src="https://www.youtube.com/v/dQw4w9WgXcQ&hl=en_US&fs=1">'
      const expected = html`
        <div
          data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          data-embed-ratio="16/9"
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace the Flash shell rather than the carrier inside it', async () => {
      const value = html`
        <object width="425" height="350" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000">
          <param name="allowfullscreen" value="true" />
          <param name="src" value="https://www.youtube.com/v/dQw4w9WgXcQ" />
          <embed src="https://www.youtube.com/v/dQw4w9WgXcQ" width="425" height="350" />
        </object>
      `
      const expected = html`
        <div
                    data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          data-embed-ratio="16/9"
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep a Flash shell that holds the publisher own fallback', async () => {
      const value = html`
        <object width="425" height="350">
          <param name="src" value="https://www.youtube.com/v/dQw4w9WgXcQ" />
          <embed src="https://www.youtube.com/v/dQw4w9WgXcQ" />
          <p>Your browser cannot play this video.</p>
        </object>
      `
      const expected = html`
        <object
          width="425"
          height="350"
        >
          <param
            value="https://www.youtube.com/v/dQw4w9WgXcQ"
            name="src"
          ></param>
          <div
            data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
            data-embed-ratio="16/9"
            data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            data-embed-provider="youtube"
            data-embed-id="dQw4w9WgXcQ"
          ></div>
          <p>Your browser cannot play this video.</p>
        </object>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a non-provider carrier to the generic placeholder', async () => {
      const value = '<embed src="https://example.com/player/embed.html">'
      const expected = html`
        <div data-embed-src="https://example.com/player/embed.html"></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })
})

const uploadId = 'de58e4a3-5505-45a7-8abc-b46c5c0f6e7a'
const uploadSrc = `https://api.substack.com/api/v1/video/upload/${uploadId}/src`

// The two parsers order attributes differently and serialize `controls` with and without a
// value, so a case that mints a media element compares through the normalizing matcher.
describeForEachParser('convertWidgets (media results)', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [convertWidgets(context)])
  }

  const withResolver = (resolver: MediaResolver): TransformContext => {
    return { ...baseContext, widgetResolvers: [resolver] }
  }

  it('should replace a container with a video element carrying controls', async () => {
    const value = `<div class="native-video-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>`
    const expected = `<video src="${uploadSrc}" controls></video>`

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should replace an audio container with an audio element', async () => {
    const value = `<div class="native-audio-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>`
    const expected = `<audio src="${uploadSrc}" controls></audio>`

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a container its resolver rejects', async () => {
    const value = '<div class="native-video-embed"></div>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should run media and embed resolvers from the one array', async () => {
    const value = html`
      <div class="native-video-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `
    const expected = html`
      <video
        src="https://api.substack.com/api/v1/video/upload/de58e4a3-5505-45a7-8abc-b46c5c0f6e7a/src"
        controls=""
      ></video>
      <div
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should write a poster onto a video', async () => {
    const posterResolver: MediaResolver = {
      kind: 'media',
      selector: '.poster-embed',
      extract: () => ({
        tag: 'video',
        src: 'https://example.com/clip.mp4',
        poster: 'https://example.com/still.jpg',
      }),
    }
    const value = '<div class="poster-embed"></div>'
    const expected = html`
      <video
        src="https://example.com/clip.mp4"
        controls
        poster="https://example.com/still.jpg"
      ></video>
    `

    expect(await transform(value, withResolver(posterResolver))).toEqualHtml(expected)
  })

  it('should not write a poster onto an audio element', async () => {
    const posterResolver: MediaResolver = {
      kind: 'media',
      selector: '.poster-embed',
      extract: () => ({
        tag: 'audio',
        src: 'https://example.com/track.mp3',
        poster: 'https://example.com/still.jpg',
      }),
    }
    const value = '<div class="poster-embed"></div>'
    const expected = '<audio src="https://example.com/track.mp3" controls></audio>'

    expect(await transform(value, withResolver(posterResolver))).toEqualHtml(expected)
  })

  // `width` and `height` are not valid on <audio>, so a resolver stating them describes a box
  // the element cannot have.
  it('should not write dimensions onto an audio element', async () => {
    const sizedResolver: MediaResolver = {
      kind: 'media',
      selector: '.poster-embed',
      extract: () => ({
        tag: 'audio',
        src: 'https://example.com/track.mp3',
        width: 480,
        height: 270,
      }),
    }
    const value = '<div class="poster-embed"></div>'
    const expected = '<audio src="https://example.com/track.mp3" controls></audio>'

    expect(await transform(value, withResolver(sizedResolver))).toEqualHtml(expected)
  })

  // A native element has nowhere to put a name, so a title travels in a figcaption beside it.
  it('should hang a stated title off the media in a figcaption', async () => {
    const titledResolver: MediaResolver = {
      kind: 'media',
      selector: '.titled-embed',
      extract: () => ({
        tag: 'audio',
        src: 'https://example.com/track.mp3',
        title: 'Track title',
      }),
    }
    const value = '<div class="titled-embed"></div>'
    const expected = html`
      <figure>
        <audio
          src="https://example.com/track.mp3"
          controls
        ></audio>
        <figcaption>Track title</figcaption>
      </figure>
    `

    expect(await transform(value, withResolver(titledResolver))).toEqualHtml(expected)
  })

  it('should mint the bare element when the title is nothing but whitespace', async () => {
    const blankTitleResolver: MediaResolver = {
      kind: 'media',
      selector: '.titled-embed',
      extract: () => ({ tag: 'audio', src: 'https://example.com/track.mp3', title: '   ' }),
    }
    const value = '<div class="titled-embed"></div>'
    const expected = '<audio src="https://example.com/track.mp3" controls></audio>'

    expect(await transform(value, withResolver(blankTitleResolver))).toEqualHtml(expected)
  })

  // The markup already gives the player a figure to sit in, which is where a caption of the
  // author's own hangs, so a second one around it would nest two figures for one player.
  it('should add no figure around media landing inside one already', async () => {
    const titledResolver: MediaResolver = {
      kind: 'media',
      selector: '.titled-embed',
      extract: () => ({
        tag: 'audio',
        src: 'https://example.com/track.mp3',
        title: 'Track title',
      }),
    }
    const value = html`
      <figure>
        <div class="titled-embed"></div>
        <figcaption>The author's own caption</figcaption>
      </figure>
    `
    const expected = html`
      <figure>
        <audio
          src="https://example.com/track.mp3"
          controls
        ></audio>
        <figcaption>The author's own caption</figcaption>
      </figure>
    `

    expect(await transform(value, withResolver(titledResolver))).toEqualHtml(expected)
  })

  it('should await an async media resolver', async () => {
    const asyncResolver: MediaResolver = {
      kind: 'media',
      selector: '.async-embed',
      extract: async () => ({ tag: 'video', src: 'https://example.com/clip.mp4' }),
    }
    const value = '<div class="async-embed"></div>'
    const expected = '<video src="https://example.com/clip.mp4" controls></video>'

    expect(await transform(value, withResolver(asyncResolver))).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = `<div class="native-video-embed" data-attrs='{"mediaUploadId":"${uploadId}"}'></div>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  describe('bare media files framed as embeds', () => {
    it('should play an iframe framing a video file as a video element', async () => {
      const value = html`
        <iframe
          src="https://cdn.example.com/clip.mp4"
          width="640"
          height="360"
        ></iframe>
      `
      const expected = html`
        <video
          src="https://cdn.example.com/clip.mp4"
          controls=""
        ></video>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should play an object framing an audio file as an audio element', async () => {
      const value = '<object data="https://cdn.example.com/ep.mp3"></object>'
      const expected = html`
        <audio
          src="https://cdn.example.com/ep.mp3"
          controls=""
        ></audio>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should play an iframe framing an aac file as an audio element', async () => {
      const value = '<iframe src="https://cdn.example.com/ep.aac"></iframe>'
      const expected = html`
        <audio
          src="https://cdn.example.com/ep.aac"
          controls=""
        ></audio>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    // A parked url has to name a media file before the container is claimed, so an unmatched
    // extension left the container empty and the reader got nothing at all.
    it('should play a parked aac url as an audio element', async () => {
      const value = '<div data-src="https://cdn.example.com/ep.aac"></div>'
      const expected = html`
        <div data-src="https://cdn.example.com/ep.aac">
          <audio
            src="https://cdn.example.com/ep.aac"
            controls=""
          ></audio>
        </div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    // A manifest plays natively only in Safari, so it stays an embed placeholder.
    it('should keep a streaming manifest as a placeholder', async () => {
      const value = '<iframe src="https://stream.example.com/live/index.m3u8"></iframe>'
      const expected = html`
        <div data-embed-src="https://stream.example.com/live/index.m3u8"></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('containers parking a media url in an attribute', () => {
    it('should convert a Discourse video placeholder', async () => {
      const value = html`
        <div
          class="video-placeholder-container"
          data-video-src="https://cdn.example.com/clip.mp4"
        ></div>
      `
      const expected = '<video src="https://cdn.example.com/clip.mp4" controls></video>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should convert an audio url into an audio element', async () => {
      const value = html`
        <div
          class="audiofield-wordpress-player"
          data-src="https://x.example/a.mp3"
        ></div>
      `
      const expected = html`
        <div class="audiofield-wordpress-player" data-src="https://x.example/a.mp3">
          <audio
            src="https://x.example/a.mp3"
            controls
          ></audio>
        </div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the container and its text, adding the media in front', async () => {
      const value = '<li data-audiopath="https://x.example/track.mp3">Track one</li>'
      const expected = html`
        <li
          data-audiopath="https://x.example/track.mp3"
        ><audio src="https://x.example/track.mp3" controls></audio>Track one</li>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should resolve a relative parked url against the base url', async () => {
      const value = '<div data-video-src="/uploads/clip.mp4"></div>'
      const context = { ...baseContext, baseUrl: 'https://forum.example/t/1' }
      const expected = html`
        <div data-video-src="/uploads/clip.mp4">
          <video
            src="https://forum.example/uploads/clip.mp4"
            controls
          ></video>
        </div>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should skip a streaming manifest', async () => {
      const value = '<div data-video-src="https://x.example/index.m3u8"></div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should skip a value that names an image', async () => {
      const value = '<div data-src="https://x.example/photo.jpg"></div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should skip a container that already wraps a player', async () => {
      const value = html`
        <div data-src="https://x.example/a.mp3">
          <audio
            controls
            src="https://x.example/a.mp3"
          ></audio>
        </div>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should take the first attribute that names a media file', async () => {
      const value = html`
        <div
          data-mp4="https://x.example/a.mp4"
          data-webm="https://x.example/a.webm"
        ></div>
      `
      const expected = html`
        <div data-mp4="https://x.example/a.mp4" data-webm="https://x.example/a.webm">
          <video
            src="https://x.example/a.mp4"
            controls
          ></video>
        </div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('post fields', () => {
    const postResolver: EmbedResolver = {
      kind: 'embed',
      selector: 'iframe[src*="post.example"]',
      extract: () => ({
        provider: 'example',
        src: 'https://post.example/embed/1',
        publisher: 'r/example',
        date: '2018.10.14',
      }),
    }
    const withPostResolver: TransformContext = {
      ...baseContext,
      widgetResolvers: [postResolver],
    }
    const value = '<iframe src="https://post.example/embed/1"></iframe>'

    it('should write publisher and date as placeholder attributes', async () => {
      const expected = html`
        <div
          data-embed-src="https://post.example/embed/1"
          data-embed-publisher="r/example"
          data-embed-provider="example"
          data-embed-date="2018.10.14"
        ></div>
      `

      expect(await transform(value, withPostResolver)).toEqualHtml(expected)
    })

    it('should normalize the date through parseDateFn', async () => {
      const parseDateFn = (raw: string) => raw.replaceAll('.', '-')
      const expected = html`
        <div
          data-embed-src="https://post.example/embed/1"
          data-embed-publisher="r/example"
          data-embed-provider="example"
          data-embed-date="2018-10-14"
        ></div>
      `

      expect(await transform(value, { ...withPostResolver, parseDateFn })).toEqualHtml(expected)
    })

    it('should keep the raw date when parseDateFn returns undefined', async () => {
      const parseDateFn = () => undefined
      const expected = html`
        <div
          data-embed-src="https://post.example/embed/1"
          data-embed-publisher="r/example"
          data-embed-provider="example"
          data-embed-date="2018.10.14"
        ></div>
      `

      expect(await transform(value, { ...withPostResolver, parseDateFn })).toEqualHtml(expected)
    })
  })
})
