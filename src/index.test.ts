import { expect, it } from 'bun:test'
import { defaultDomTransforms } from './defaults.js'
import { transformContent } from './index.js'
import { describeForEachParser } from './tests.js'
import { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'

const startsWithDiv = /^<div>/

describeForEachParser('transformContent', (parseHtml) => {
  it('should apply all default transforms', async () => {
    const html = '<div><p>Hello <img data-src="photo.jpg"></p></div>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    // unwrapWrappers should remove the outer div.
    expect(result).not.toMatch(startsWithDiv)
    // fixLazyImages should resolve data-src to src, and resolveRelativeUrls makes it absolute.
    expect(result).toContain('src="https://example.com/photo.jpg"')
    expect(result).not.toContain('data-src')
  })

  it('should resolve relative URLs when baseUrl is provided', async () => {
    const html = '<p><a href="/about">About</a></p>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post/1',
    })

    expect(result).toContain('href="https://example.com/about"')
  })

  it('should strip tracking parameters', async () => {
    const html = '<p><a href="https://example.com?utm_source=feed&id=1">Link</a></p>'
    const result = await transformContent(html, { parseHtmlFn: parseHtml })

    expect(result).not.toContain('utm_source')
    expect(result).toContain('id=1')
  })

  it('should remove tracking pixels', async () => {
    const html = '<p>Text</p><img width="1" height="1" src="https://track.example.com/pixel.gif">'
    const result = await transformContent(html, { parseHtmlFn: parseHtml })

    expect(result).not.toContain('pixel.gif')
  })

  it('should allow overriding the dom transforms array', async () => {
    const html = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      domTransforms: defaultDomTransforms.filter((t) => t.name !== 'stripTrackingParams'),
    })

    expect(result).toContain('utm_source')
  })

  it('should handle empty string', async () => {
    const result = await transformContent('', { parseHtmlFn: parseHtml })

    expect(result).toBeDefined()
  })

  it('should handle plain text by wrapping in paragraphs', async () => {
    const result = await transformContent('Hello world', { parseHtmlFn: parseHtml })

    expect(result).toContain('<p>Hello world</p>')
  })

  it('should use built-in YouTube embed resolver', async () => {
    const html =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcB" width="560" height="315"></iframe>'
    const result = await transformContent(html, { parseHtmlFn: parseHtml })

    expect(result).toContain('data-embed-src=')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('youtube-nocookie.com')
  })

  it('should allow custom embedResolvers', async () => {
    const html = '<iframe src="https://custom-player.example.com/video/123"></iframe>'
    const result = await transformContent(html, {
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
    })

    expect(result).toContain('data-embed-provider="custom"')
  })

  it('should inject audio/video enclosures as native media elements', async () => {
    const html = '<p>Content</p>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
    })

    expect(result).toContain('<audio')
    expect(result).toContain('audio.mp3')
  })

  it('should remove paragraphs left empty after boundary br stripping', async () => {
    const html = '<p>Hello</p><p><br></p><p>World</p>'
    const result = await transformContent(html, { parseHtmlFn: parseHtml })

    expect(result).toBe('<p>Hello</p><p>World</p>')
  })

  it('should preserve empty paragraphs when stripEmptyTags is removed from the pipeline', async () => {
    const html = '<p>Hello</p><p><br></p><p>World</p>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      domTransforms: defaultDomTransforms.filter((t) => t.name !== 'stripEmptyTags'),
    })

    expect(result).toBe('<p>Hello</p><p></p><p>World</p>')
  })

  it('should preserve comments inside pre blocks through full pipeline', async () => {
    const html = '<pre>before <!-- preserved --> after</pre>'
    const result = await transformContent(html, { parseHtmlFn: parseHtml })

    expect(result).toContain('<!-- preserved -->')
  })

  it('should proxy asset URLs through assetProxyFn in the default pipeline', async () => {
    const html = '<p><img src="https://cdn.example.com/photo.jpg"></p>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
    })

    expect(result).toContain(
      'src="https://proxy.example.com/image/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"',
    )
  })

  it('should proxy native enclosure media elements injected by injectEnclosures', async () => {
    const html = '<p>Content</p>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
      assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
    })

    expect(result).toContain(
      'src="https://proxy.example.com/audio/https%3A%2F%2Fexample.com%2Faudio.mp3"',
    )
  })

  // enrichEmbedPlaceholders is opt-in; default pipeline does not include it.
  it('should enrich embed placeholders with metadata from enrichEmbedFn when opted in', async () => {
    const html =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>'
    const result = await transformContent(html, {
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
    })

    expect(result).toContain('data-embed-title="Title for dQw4w9WgXcQ"')
    expect(result).toContain('data-embed-author="Test Channel"')
    expect(result).toContain('data-embed-duration="213"')
  })

  it('should leave embed placeholders unenriched when enrichEmbedFn returns an empty map', async () => {
    const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      domTransforms: [...defaultDomTransforms, enrichEmbedPlaceholders],
      enrichEmbedFn: () => new Map(),
    })

    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
    expect(result).not.toContain('data-embed-title')
    expect(result).not.toContain('data-embed-author')
    expect(result).not.toContain('data-embed-duration')
  })

  it('should leave embed placeholders unenriched when enrichEmbedPlaceholders is not in the pipeline', async () => {
    const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    let called = false
    const result = await transformContent(html, {
      parseHtmlFn: parseHtml,
      enrichEmbedFn: () => {
        called = true
        return new Map([['youtube:dQw4w9WgXcQ', { title: 'Unused' }]])
      },
    })

    expect(called).toBe(false)
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
    expect(result).not.toContain('data-embed-title')
  })

  it('should preserve ghost bookmark widget placeholders through unwrapWrappers', async () => {
    const html = [
      '<figure class="kg-card kg-bookmark-card">',
      '<a class="kg-bookmark-container" href="https://example.com/post">',
      '<div class="kg-bookmark-content">',
      '<div class="kg-bookmark-title">Post title</div>',
      '<div class="kg-bookmark-description">Preview text</div>',
      '<div class="kg-bookmark-metadata">',
      '<img class="kg-bookmark-icon" src="https://example.com/favicon.ico" alt="">',
      '<span class="kg-bookmark-author">Author name</span>',
      '<span class="kg-bookmark-publisher">Publisher name</span>',
      '</div>',
      '</div>',
      '<div class="kg-bookmark-thumbnail"><img src="https://example.com/og-image.jpg" alt=""></div>',
      '</a>',
      '</figure>',
    ].join('')
    const result = await transformContent(html, { parseHtmlFn: parseHtml })

    expect(result).toContain('data-bookmark-provider="ghost"')
    expect(result).toContain('data-bookmark-url="https://example.com/post"')
    expect(result).toContain('data-bookmark-title="Post title"')
    expect(result).toContain('data-bookmark-description="Preview text"')
    expect(result).toContain('data-bookmark-author="Author name"')
    expect(result).toContain('data-bookmark-publisher="Publisher name"')
    expect(result).toContain('data-bookmark-icon="https://example.com/favicon.ico"')
    expect(result).toContain('data-bookmark-thumbnail="https://example.com/og-image.jpg"')
    expect(result).toContain('<a href="https://example.com/post">Post title</a>')
    expect(result).not.toContain('kg-bookmark')
    expect(result).not.toContain('<figure')
  })
})
