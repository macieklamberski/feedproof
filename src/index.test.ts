import { expect, it } from 'bun:test'
import { defaultDomTransforms } from './defaults.js'
import { transformContent } from './index.js'
import { describeForEachParser, html } from './tests.js'
import { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'

describeForEachParser('transformContent', (parseHtml) => {
  it('should apply all default transforms', async () => {
    const value = '<div><p>Hello <img data-src="photo.jpg"></p></div>'
    // unwrapWrappers removes the outer div, fixLazyImages resolves data-src to src, and
    // resolveRelativeUrls makes it absolute.
    const expected = '<p>Hello <img src="https://example.com/photo.jpg"></p>'

    expect(
      await transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com' }),
    ).toBe(expected)
  })

  it('should resolve relative URLs when baseUrl is provided', async () => {
    const value = '<p><a href="/about">About</a></p>'
    const expected = '<p><a href="https://example.com/about">About</a></p>'

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post/1',
      }),
    ).toBe(expected)
  })

  it('should strip tracking parameters via cleanUrlFn', async () => {
    const value = '<p><a href="https://example.com?utm_source=feed&id=1">Link</a></p>'
    const expected = '<p><a href="https://example.com/?id=1">Link</a></p>'

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        cleanUrlFn: (url) => {
          const parsed = new URL(url)
          parsed.searchParams.delete('utm_source')
          return parsed.toString()
        },
      }),
    ).toBe(expected)
  })

  it('should remove tracking pixels', async () => {
    const value = html`
      <p>Text</p>
      <img width="1" height="1" src="https://track.example.com/pixel.gif">
    `
    const expected = '<p>Text</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should normalize a standalone code block to a scrollable pre, not a paragraph', async () => {
    const value = '<code>function greet(name) {\n  return name\n}</code>'
    // highlightCode promotes the bare block to <pre><code> before wrapBareInlineInParagraphs
    // runs, so it ends up as a scrollable code block, not a <pre> nested inside a <p>.
    // It is unlabeled and not JSON, so it stays plain (no highlighting, no badge).
    const expected = '<pre><code>function greet(name) {\n  return name\n}</code></pre>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should clean anchor urls with the provided cleanUrlFn', async () => {
    const value = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'
    const expected = '<p><a href="https://example.com">Link</a></p>'

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        cleanUrlFn: (url) => url.split('?')[0],
      }),
    ).toBe(expected)
  })

  it('should allow overriding the dom transforms array', async () => {
    const value = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'
    const expected = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        cleanUrlFn: (url) => url.split('?')[0],
        domTransforms: defaultDomTransforms.filter((t) => t.name !== 'cleanAnchorUrls'),
      }),
    ).toBe(expected)
  })

  it('should handle empty string', async () => {
    expect(await transformContent('', { parseHtmlFn: parseHtml })).toBe('')
  })

  it('should handle plain text by wrapping in paragraphs', async () => {
    const expected = '<p>Hello world</p>\n'

    expect(await transformContent('Hello world', { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should use built-in YouTube embed resolver', async () => {
    const value = html`
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcB"
        width="560"
        height="315"
      >
      </iframe>
    `
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcB"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcB"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcB"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcB/hqdefault.jpg"
        data-embed-width="560"
        data-embed-height="315"
      >
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcB"
        >https://www.youtube.com/watch?v=dQw4w9WgXcB</a>
      </div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should allow custom embedResolvers', async () => {
    const value = '<iframe src="https://custom-player.example.com/video/123"></iframe>'
    const expected = html`
      <div
        data-embed-provider="custom"
        data-embed-src="https://custom-player.example.com/video/123"
      >
        <a
          href="https://custom-player.example.com/video/123"
        >https://custom-player.example.com/video/123</a>
      </div>
    `

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        embedResolvers: [
          {
            selector: 'iframe[src]',
            extract: (element) => {
              const src = element.getAttribute('src') ?? ''
              if (src.includes('custom-player.example.com')) {
                return { provider: 'custom', src }
              }
            },
          },
        ],
      }),
    ).toEqualHtml(expected)
  })

  it('should inject audio/video enclosures as native media elements', async () => {
    const value = '<p>Content</p>'
    const expected = html`
      <audio src="https://example.com/audio.mp3" controls preload="none"></audio>
      <p>Content</p>
    `

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
      }),
    ).toEqualHtml(expected)
  })

  it('should remove paragraphs left empty after boundary br stripping', async () => {
    const value = html`
      <p>Hello</p>
      <p><br></p>
      <p>World</p>
    `
    const expected = html`
      <p>Hello</p>
      <p>World</p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should preserve empty paragraphs when stripEmptyTags is removed from the pipeline', async () => {
    const value = html`
      <p>Hello</p>
      <p><br></p>
      <p>World</p>
    `
    const expected = html`
      <p>Hello</p>
      <p></p>
      <p>World</p>
    `

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        domTransforms: defaultDomTransforms.filter((t) => t.name !== 'stripEmptyTags'),
      }),
    ).toBe(expected)
  })

  it('should preserve comments inside pre blocks through full pipeline', async () => {
    const value = '<pre>before <!-- preserved --> after</pre>'
    const expected = '<pre><code>before <!-- preserved --> after</code></pre>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should proxy asset URLs through assetProxyFn in the default pipeline', async () => {
    const value = '<p><img src="https://cdn.example.com/photo.jpg"></p>'
    const expected =
      '<p><img src="https://proxy.example.com/image/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"></p>'

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
      }),
    ).toBe(expected)
  })

  it('should proxy native enclosure media elements injected by injectEnclosures', async () => {
    const value = '<p>Content</p>'
    const expected = html`
      <audio
        src="https://proxy.example.com/audio/https%3A%2F%2Fexample.com%2Faudio.mp3"
        controls
        preload="none"
      >
      </audio>
      <p>Content</p>
    `

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
        assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
      }),
    ).toEqualHtml(expected)
  })

  // enrichEmbedPlaceholders is opt-in; default pipeline does not include it.
  it('should enrich embed placeholders with metadata from enrichEmbedFn when opted in', async () => {
    const value = html`
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        width="560"
        height="315"
      >
      </iframe>
    `
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-width="560"
        data-embed-height="315"
        data-embed-title="Title for dQw4w9WgXcQ"
        data-embed-author="Test Channel"
        data-embed-duration="213"
      >
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        >https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>
      </div>
    `

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        domTransforms: [...defaultDomTransforms, enrichEmbedPlaceholders],
        enrichEmbedFn: (embeds) => {
          return new Map(
            embeds.map(({ provider, id }) => [
              `${provider}:${id}`,
              { title: `Title for ${id}`, author: 'Test Channel', duration: 213 },
            ]),
          )
        },
      }),
    ).toEqualHtml(expected)
  })

  it('should leave embed placeholders unenriched when enrichEmbedFn returns an empty map', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
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
    `

    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        domTransforms: [...defaultDomTransforms, enrichEmbedPlaceholders],
        enrichEmbedFn: () => new Map(),
      }),
    ).toEqualHtml(expected)
  })

  it('should leave embed placeholders unenriched when enrichEmbedPlaceholders is not in the pipeline', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    let called = false
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enrichEmbedFn: () => {
        called = true
        return new Map([['youtube:dQw4w9WgXcQ', { title: 'Unused' }]])
      },
    })
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
    `

    expect(called).toBe(false)
    expect(result).toEqualHtml(expected)
  })

  it('should preserve ghost bookmark widget placeholders through unwrapWrappers', async () => {
    const value = html`
      <figure class="kg-card kg-bookmark-card">
        <a class="kg-bookmark-container" href="https://example.com/post">
          <div class="kg-bookmark-content">
            <div class="kg-bookmark-title">Post title</div>
            <div class="kg-bookmark-description">Preview text</div>
            <div class="kg-bookmark-metadata">
              <img class="kg-bookmark-icon" src="https://example.com/favicon.ico" alt="">
              <span class="kg-bookmark-author">Author name</span>
              <span class="kg-bookmark-publisher">Publisher name</span>
            </div>
          </div>
          <div class="kg-bookmark-thumbnail">
            <img src="https://example.com/og-image.jpg" alt="">
          </div>
        </a>
      </figure>
    `
    const expected = html`
      <div
        data-bookmark-provider="ghost"
        data-bookmark-url="https://example.com/post"
        data-bookmark-title="Post title"
        data-bookmark-description="Preview text"
        data-bookmark-author="Author name"
        data-bookmark-publisher="Publisher name"
        data-bookmark-icon="https://example.com/favicon.ico"
        data-bookmark-thumbnail="https://example.com/og-image.jpg"
      >
        <p><a href="https://example.com/post">Post title</a></p>
      </div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should dimension a lazy image from its resolved URL', async () => {
    const value = '<p><img data-src="https://example.com/photo-1024x768.jpg"></p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toContain('src="https://example.com/photo-1024x768.jpg"')
    expect(result).toContain('width="1024"')
    expect(result).toContain('height="768"')
  })

  it('should let a picture modern source win over a lazy data-src', async () => {
    const value = html`
      <p>
        <picture>
          <source type="image/webp" srcset="https://example.com/a-800x600.webp">
          <img data-src="https://example.com/a.jpg">
        </picture>
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toContain('src="https://example.com/a-800x600.webp"')
    expect(result).not.toContain('a.jpg')
  })

  it('should dimension an image surfaced from a noscript fallback', async () => {
    const value = html`
      <p>
        <img src="https://example.com/placeholder.gif">
        <noscript><img src="https://example.com/real-1024x768.jpg"></noscript>
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toContain('src="https://example.com/real-1024x768.jpg"')
    expect(result).toContain('width="1024"')
    expect(result).toContain('height="768"')
    expect(result).not.toContain('placeholder.gif')
  })

  it('should carry picture dimensions onto the flattened image', async () => {
    const value = html`
      <p>
        <picture width="277" height="530">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpg">
        </picture>
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toContain('width="277"')
    expect(result).toContain('height="530"')
    expect(result).toContain('src="https://example.com/a.webp"')
  })

  it.todo('should preserve substack publication embeds through the full pipeline', () => {
    // An .embedded-publication-wrap card with a data-attrs JSON blob should come
    // out of the default pipeline as a data-bookmark-provider="substack" placeholder.
  })

  it.todo('should propagate an error thrown by a dom transform', () => {
    // A custom domTransforms entry that throws should reject the transformContent promise.
  })

  it.todo('should propagate an error thrown by parseHtmlFn', () => {
    // A rejecting parseHtmlFn should reject transformContent before any dom transform runs.
  })

  it.todo('should be idempotent when run over its own output', () => {
    // Running transformContent twice over representative input (paragraphs, lazy
    // images, embeds) should produce the same output as running it once.
  })

  it.todo('should allow overriding the string transforms array', () => {
    // With stringTransforms: [], a CDATA comment wrapper that the default
    // unwrapCdataComments would unwrap should survive into the DOM stage.
  })

  it.todo('should use a custom resolveUrlFn when resolving relative URLs', () => {
    // A resolveUrlFn override should control how relative hrefs resolve against baseUrl.
  })

  it.todo('should allow custom bookmarkResolvers', () => {
    // A custom resolver matching bespoke card markup should replace the card with
    // a data-bookmark-* placeholder, like the built-in ghost resolver does.
  })

  it.todo('should strip a duplicated leading heading when articleTitle matches', () => {
    // With articleTitle equal to the first heading text, stripDuplicateTitleHeading
    // should remove that heading from the output.
  })
})
