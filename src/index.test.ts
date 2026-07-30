import { describe, expect, it } from 'bun:test'
import { defaultStandardDomTransforms } from './defaults.js'
import { transformContent } from './index.js'
import { describeForEachParser, html } from './tests.js'
import { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'

const lineBreakAfterBraceRegex = /\{\n\s+/

describeForEachParser('transformContent', (parseHtml) => {
  it('should apply all default transforms', async () => {
    const value = '<div><p>Hello <img data-src="photo.jpg"></p></div>'
    // unwrapWrappers removes the outer div, fixLazyImages resolves data-src to src (keeping
    // the original attribute), and resolveRelativeUrls makes the src absolute.
    const expected = '<p>Hello <img data-src="photo.jpg" src="https://example.com/photo.jpg"></p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should resolve relative URLs when baseUrl is provided', async () => {
    const value = '<p><a href="/about">About</a></p>'
    const expected = '<p><a href="https://example.com/about">About</a></p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post/1',
    })

    expect(result).toBe(expected)
  })

  it('should strip tracking parameters via cleanUrlFn', async () => {
    const value = '<p><a href="https://example.com?utm_source=feed&id=1">Link</a></p>'
    const expected = '<p><a href="https://example.com/?id=1">Link</a></p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      cleanUrlFn: (url) => {
        const parsed = new URL(url)
        parsed.searchParams.delete('utm_source')
        return parsed.toString()
      },
    })

    expect(result).toBe(expected)
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

  it('should keep <br>-delimited code lines multi-line and not merge adjacent blocks', async () => {
    // Prism/Eleventy feeds separate code lines with <br> inside <pre>, not \n.
    // replacePreLineBreaks must run before highlightCode so the lines survive
    // highlighting and the two blocks are not collapsed into a single merged pre.
    const value = [
      '<pre class="language-html"><code class="language-html"><span class="highlight-line">&lt;div&gt;Hi&lt;/div&gt;</span></code></pre>',
      '<pre class="language-css"><code class="language-css"><span class="highlight-line">.error {</span><br /><span class="highlight-line">  content: "x";</span><br /><span class="highlight-line">}</span></code></pre>',
    ].join('\n')
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect((result.match(/<pre /g) ?? []).length).toBe(2)
    expect(result).toContain('data-pre-label="HTML"')
    expect(result).toContain('data-pre-label="CSS"')
    expect(result).toMatch(lineBreakAfterBraceRegex)
  })

  it('should decode a multi-line double-escaped description in full', async () => {
    // A double-escaping feed generator ships whole HTML as entity text spread across
    // lines. paragraphizePlainText must pass it through so decodeDoubleEncodedTags gets
    // the whole fragment as one text node; otherwise only the lines holding a complete
    // tag pair decode and the rest stays visible as escaped text.
    const value = [
      '&lt;p&gt;A &lt;a href=&#34;https://example.com/about&#34;&gt;now page&lt;/a&gt;',
      ': what has my attention.&lt;/p&gt;',
      '&lt;h2 id=&#34;building&#34;&gt;Building&lt;/h2&gt;',
      '&lt;ul&gt;',
      '&lt;li&gt;&lt;strong&gt;first&lt;/strong&gt; item&lt;/li&gt;',
      '&lt;/ul&gt;',
    ].join('\n')
    const expected = [
      '<p>A <a href="https://example.com/about">now page</a>',
      ': what has my attention.</p>',
      '<h2><a href="#building" id="building"></a>Building</h2>',
      '<ul>',
      '<li><strong>first</strong> item</li>',
      '</ul>',
    ].join('\n')
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should clean anchor urls with the provided cleanUrlFn', async () => {
    const value = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'
    const expected = '<p><a href="https://example.com">Link</a></p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      cleanUrlFn: (url) => url.split('?')[0],
    })

    expect(result).toBe(expected)
  })

  it('should allow overriding the dom transforms array', async () => {
    const value = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'
    const expected = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      cleanUrlFn: (url) => url.split('?')[0],
      domTransforms: defaultStandardDomTransforms.filter((t) => t.name !== 'cleanAnchorUrls'),
    })

    expect(result).toBe(expected)
  })

  it('should handle empty string', async () => {
    expect(await transformContent('', { parseHtmlFn: parseHtml })).toBe('')
  })

  it('should handle plain text by wrapping in paragraphs', async () => {
    const expected = '<p>Hello world</p>\n'

    expect(await transformContent('Hello world', { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should linkify a bare url whole when a wbr splits it', async () => {
    // Email clients emit long links as `youtu.be/<wbr>{id}`. Without stripping the <wbr>
    // first, linkifyUrls sees only `https://youtu.be/` and makes a dead stub, dropping the
    // id to plain text. The whole url must become one working link.
    const value = '<p>Watch <span>https://youtu.be/<wbr></wbr>HnLpU5vd5rI</span></p>'
    const expected =
      '<p>Watch <span><a href="https://youtu.be/HnLpU5vd5rI">https://youtu.be/HnLpU5vd5rI</a></span></p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should keep an anchored wbr url working and drop the break hint', async () => {
    const value =
      '<p><a href="https://youtu.be/HnLpU5vd5rI">https://youtu.be/<wbr></wbr>HnLpU5vd5rI</a></p>'
    const expected =
      '<p><a href="https://youtu.be/HnLpU5vd5rI">https://youtu.be/HnLpU5vd5rI</a></p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
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

  it('should resolve a YouTube playlist embed to a posterless youtube placeholder', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/videoseries?list=PLabc123"></iframe>'
    // `videoseries` is a playlist, not a video: keep the working src, give a canonical playlist
    // url, and no thumbnail (a playlist has no id-derivable poster). The list id stays as the
    // enrichment key.
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="PLabc123"
        data-embed-src="https://www.youtube.com/embed/videoseries?list=PLabc123"
        data-embed-url="https://www.youtube.com/playlist?list=PLabc123"
      >
        <a
          href="https://www.youtube.com/playlist?list=PLabc123"
        >https://www.youtube.com/playlist?list=PLabc123</a>
      </div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should resolve a YouTube channel live embed to a posterless youtube placeholder', async () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/live_stream?channel=UCabc123"></iframe>'
    // `live_stream` is a channel live embed, not a video: the `channel` param is preserved
    // (resolving it as a video would drop it and leave a dead `embed/live_stream`), the url
    // points at the channel, and there is no thumbnail. The channel id is the enrichment key.
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="UCabc123"
        data-embed-src="https://www.youtube.com/embed/live_stream?channel=UCabc123"
        data-embed-url="https://www.youtube.com/channel/UCabc123"
      >
        <a
          href="https://www.youtube.com/channel/UCabc123"
        >https://www.youtube.com/channel/UCabc123</a>
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
    const result = await transformContent(value, {
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

    expect(result).toEqualHtml(expected)
  })

  it('should inject audio/video enclosures as native media elements', async () => {
    const value = '<p>Content</p>'
    const expected = html`
      <audio src="https://example.com/audio.mp3" controls preload="none" data-enclosure=""></audio>
      <p>Content</p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
    })

    expect(result).toEqualHtml(expected)
  })

  it('should not inject an image enclosure when the content already has an image', async () => {
    // The enclosure is a WordPress-sized copy of the inline content image. Because the
    // content already carries an image, injectEnclosures skips it in both modes, so the
    // duplicate never appears regardless of the heuristics flag.
    const value = '<p>Content</p><img src="https://example.com/uploads/photo.jpg">'
    const enclosures = [
      { url: 'https://example.com/uploads/photo-800x450.jpg', type: 'image/jpeg' },
    ]

    const standard = await transformContent(value, { parseHtmlFn: parseHtml, enclosures })
    const heuristic = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enclosures,
      heuristics: true,
    })

    expect(standard).not.toContain('photo-800x450.jpg')
    expect(heuristic).not.toContain('photo-800x450.jpg')
  })

  it('should strip a duplicate enclosure media only when heuristics are enabled', async () => {
    // The enclosure is the same audio already embedded in the content. Audio always
    // injects (no inline equivalent), so this is where stripDuplicateEnclosures earns
    // its keep, and only under heuristics.
    const value = '<p>Content</p><audio src="https://example.com/episode.mp3"></audio>'
    const enclosures = [{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }]

    const standard = await transformContent(value, { parseHtmlFn: parseHtml, enclosures })
    const heuristic = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enclosures,
      heuristics: true,
    })

    expect(standard).toContain('data-enclosure')
    expect(heuristic).not.toContain('data-enclosure')
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
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      domTransforms: defaultStandardDomTransforms.filter((t) => t.name !== 'stripEmptyTags'),
    })

    expect(result).toBe(expected)
  })

  it('should preserve comments inside pre blocks through full pipeline', async () => {
    const value = '<pre>before <!-- preserved --> after</pre>'
    const expected = '<pre><code>before <!-- preserved --> after</code></pre>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should proxy asset URLs through assetProxyFn in the default pipeline', async () => {
    const value = '<p><img src="https://cdn.example.com/photo.jpg"></p>'
    const expected = html`
      <p>
        <img
          src="https://proxy.example.com/image/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
          data-proxied-src="https://cdn.example.com/photo.jpg"
        >
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
    })

    expect(result).toEqualHtml(expected)
  })

  it('should proxy native enclosure media elements injected by injectEnclosures', async () => {
    const value = '<p>Content</p>'
    const expected = html`
      <audio
        src="https://proxy.example.com/audio/https%3A%2F%2Fexample.com%2Faudio.mp3"
        data-proxied-src="https://example.com/audio.mp3"
        controls
        preload="none"
        data-enclosure=""
      >
      </audio>
      <p>Content</p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
      assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
    })

    expect(result).toEqualHtml(expected)
  })

  // enrichEmbedPlaceholders is opt-in; default pipeline does not include it.
  it('should enrich embed placeholders with metadata from enrichEmbedFn', async () => {
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
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enrichEmbedFn: (embeds) => {
        return new Map(
          embeds.map(({ provider, id }) => [
            `${provider}:${id}`,
            { title: `Title for ${id}`, author: 'Test Channel', duration: 213 },
          ]),
        )
      },
    })

    expect(result).toEqualHtml(expected)
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
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enrichEmbedFn: () => new Map(),
    })

    expect(result).toEqualHtml(expected)
  })

  // A Tumblr link block names its poster by media_key alone, with no URL to render, so the
  // thumbnail can only come from the caller resolving that key.
  it('should enrich cite placeholders with metadata from enrichCiteFn', async () => {
    const value = html`
      <p
        class="npf_link"
        data-npf='{"type":"link","url":"https://example.com/post","title":"Page title","site_name":"example.com","poster":[{"media_key":"0b043233:b33b79b8","type":"image/png","width":800,"height":316}]}'
      >
        <a href="https://example.com/post" target="_blank">Page title</a>
      </p>
    `
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-publisher="example.com"
        data-cite-url="https://example.com/post"
        data-cite-title="Page title"
        data-cite-thumbnail="https://example.com/cover.png"
      >
        <a href="https://example.com/post">Page title</a>
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enrichCiteFn: (cites) => {
        return new Map(
          cites.map(({ url }) => [url, { thumbnail: 'https://example.com/cover.png' }]),
        )
      },
    })

    expect(result).toEqualHtml(expected)
  })

  it('should collapse a Steam news YouTube facade into a clean embed placeholder', async () => {
    const value = html`
      <p>Watch the trailer:</p>
      <div class="sharedFilePreviewYouTubeVideo">
        <img
          class="sharedFilePreviewYouTubeVideo"
          src="https://steamcommunity.com/public/shared/images/responsive/youtube_16x9_placeholder.gif"
        />
        <iframe
          src="https://www.youtube-nocookie.com/embed/QMIjaUgLLJg?fs=1&modestbranding=1&rel=0"
          allowFullScreen="1"
          frameBorder="0"
        ></iframe>
      </div>
    `
    const expected = html`
      <p>Watch the trailer:</p>
      <div
        data-embed-provider="youtube"
        data-embed-id="QMIjaUgLLJg"
        data-embed-src="https://www.youtube.com/embed/QMIjaUgLLJg"
        data-embed-url="https://www.youtube.com/watch?v=QMIjaUgLLJg"
        data-embed-thumbnail="https://i.ytimg.com/vi/QMIjaUgLLJg/hqdefault.jpg"
      >
        <a
          href="https://www.youtube.com/watch?v=QMIjaUgLLJg"
        >https://www.youtube.com/watch?v=QMIjaUgLLJg</a>
      </div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should not enrich when enrichEmbedPlaceholders is removed from the pipeline', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    let called = false
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      domTransforms: defaultStandardDomTransforms.filter(
        (transform) => transform !== enrichEmbedPlaceholders,
      ),
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

  it('should preserve ghost cite placeholders through unwrapWrappers', async () => {
    const value = html`
      <figure class="kg-card kg-bookmark-card">
        <a class="kg-bookmark-container" href="https://example.com/post">
          <div class="kg-bookmark-content">
            <div class="kg-bookmark-title">Post title</div>
            <div class="kg-bookmark-description">Preview text</div>
            <div class="kg-bookmark-metadata">
              <img class="kg-bookmark-icon" src="https://example.com/favicon.ico" alt="">
              <span class="kg-bookmark-author">Publisher name</span>
              <span class="kg-bookmark-publisher">Author name</span>
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
        data-cite-provider="ghost"
        data-cite-url="https://example.com/post"
        data-cite-title="Post title"
        data-cite-description="Preview text"
        data-cite-author="Author name"
        data-cite-publisher="Publisher name"
        data-cite-icon="https://example.com/favicon.ico"
        data-cite-thumbnail="https://example.com/og-image.jpg"
      >
        <a href="https://example.com/post">Post title</a>
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
    // The superseded data-src is left in place (fixLazyImages no longer strips it).
    expect(result).toContain('data-src="https://example.com/a.jpg"')
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

  it('should convert a substack post embed into a cite placeholder', async () => {
    const value = html`
      <p>Intro</p>
      <div
        class="digest-post-embed"
        data-attrs="{&quot;title&quot;:&quot;Model Drop&quot;,&quot;canonical_url&quot;:&quot;https://thereader.example.com/p/model-drop&quot;}"
      ></div>
    `
    const expected = html`
      <p>Intro</p>
      <div
        data-cite-provider="substack"
        data-cite-url="https://thereader.example.com/p/model-drop"
        data-cite-title="Model Drop"
      >
        <a href="https://thereader.example.com/p/model-drop">Model Drop</a>
      </div>
    `

    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should strip substack publication embeds as non-content', async () => {
    const value = `<p>Text</p><div class="embedded-publication-wrap" data-attrs='{"name":"Other Pub","base_url":"https://other.substack.com","hero_text":"A great read"}'></div>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toContain('<p>Text</p>')
    expect(result).not.toContain('embedded-publication-wrap')
    expect(result).not.toContain('Other Pub')
  })

  // Markup that reaches a clean shape through the interaction of generic transforms alone,
  // with no platform-specific transform. Substack's captioned image is the case:
  // `unwrapWrappers` dissolves its container divs, `flattenPictureElements` collapses the
  // `<picture>`, and `stripNonContentElements` removes the restack chrome. A regression in
  // any of those would break the normalization silently, since no single-transform test
  // covers the combination.
  describe('platform image normalization without a dedicated transform', () => {
    it('should normalize a Substack captioned image to a clean figure', async () => {
      const value = html`
        <div class="captioned-image-container">
          <figure>
            <a
              class="image-link image2 is-viewable-img"
              target="_blank"
              href="https://cdn.example.com/full.png"
              data-component-name="Image2ToDOM"
            >
              <div class="image2-inset">
                <picture>
                  <source type="image/webp" srcset="https://cdn.example.com/w_848.webp 848w" />
                  <img src="https://cdn.example.com/w_1456.png" width="654" height="493" alt="A chart" />
                </picture>
                <div class="image-link-expand">
                  <button class="restack-image">restack</button>
                  <button class="view-image">view</button>
                </div>
              </div>
            </a>
            <figcaption class="image-caption">Figure 1: the caption</figcaption>
          </figure>
        </div>
      `
      const expected = html`
        <figure>
          <a
            class="image-link image2 is-viewable-img"
            target="_blank"
            href="https://cdn.example.com/full.png"
            data-component-name="Image2ToDOM"
          >
            <img
              srcset="https://cdn.example.com/w_848.webp 848w"
              src="https://cdn.example.com/w_848.webp"
              width="654"
              height="493"
              alt="A chart"
            />
          </a>
          <figcaption class="image-caption">Figure 1: the caption</figcaption>
        </figure>
      `

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })

    it('should normalize a Substack captioned image that has no caption', async () => {
      const value = html`
        <div class="captioned-image-container">
          <figure>
            <a class="image-link image2" href="https://cdn.example.com/full.png" data-component-name="Image2ToDOM">
              <div class="image2-inset">
                <picture><img src="https://cdn.example.com/img.png" width="600" height="400" alt="" /></picture>
                <div class="image-link-expand"><button class="restack-image">restack</button></div>
              </div>
            </a>
          </figure>
        </div>
      `
      const expected = html`
        <figure>
          <a class="image-link image2" href="https://cdn.example.com/full.png" data-component-name="Image2ToDOM">
            <img src="https://cdn.example.com/img.png" width="600" height="400" alt="" />
          </a>
        </figure>
      `

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })
  })

  describe('Avada privacy embed without a dedicated transform', () => {
    // Avada gates a video behind a consent notice: a hidden <iframe> parks the real URL in
    // data-privacy-src, and a sibling .fusion-privacy-placeholder shows "please accept". No
    // single transform owns this — fixLazyIframes recovers the iframe (then the youtube
    // resolver placeholders it) while stripNonContentElements removes the notice.
    it('should recover the gated video and strip the "please accept" notice', async () => {
      const value = html`
        <p><iframe class="fusion-hidden" data-privacy-type="youtube" src="" title="YouTube video player" data-privacy-src="https://www.youtube.com/embed/0OqYNLrUoes?si=ZEdmlrLKAggBE_AS" width="560" height="315"></iframe></p>
        <div class="fusion-privacy-placeholder" style="width:560px; height:315px;" data-privacy-type="youtube">
          <div class="fusion-privacy-placeholder-content">
            <div class="fusion-privacy-label">For privacy reasons YouTube needs your permission to be loaded.</div>
            <a href="" class="fusion-privacy-consent">I Accept</a>
          </div>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      // Video recovered into a YouTube placeholder.
      expect(result).toContain('data-embed-provider="youtube"')
      expect(result).toContain('data-embed-src="https://www.youtube.com/embed/0OqYNLrUoes"')
      // Consent notice and its text gone.
      expect(result).not.toContain('fusion-privacy-placeholder')
      expect(result).not.toContain('For privacy reasons')
      expect(result).not.toContain('I Accept')
    })
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

  it.todo('should allow custom citeResolvers', () => {
    // A custom resolver matching bespoke card markup should replace the card with
    // a data-cite-* placeholder, like the built-in ghost resolver does.
  })

  it.todo('should strip a duplicated leading heading when articleTitle matches', () => {
    // With articleTitle equal to the first heading text, stripDuplicateTitleHeading
    // should remove that heading from the output.
  })

  it('should remove hidden elements', async () => {
    const value = '<p>Keep</p><div hidden>Gone</div><p style="display:none">Also gone</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('Keep')
    expect(result).not.toContain('Gone')
    expect(result).not.toContain('Also gone')
  })

  it('should strip non-content widget elements', async () => {
    const value = '<p>Article text</p><div class="adsbygoogle">Ad slot</div>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('Article text')
    expect(result).not.toContain('Ad slot')
  })

  it('should strip comments outside pre blocks', async () => {
    const value = '<p>Text<!-- leaked build note --></p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('Text')
    expect(result).not.toContain('leaked build note')
  })

  it('should replace an emoji image with its alt text', async () => {
    const value =
      '<p>Hello <img src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png" alt="\u{1F609}" class="wp-smiley"> world</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('\u{1F609}')
    expect(result).not.toContain('<img')
  })

  it('should convert amp-img into a plain image', async () => {
    const value =
      '<amp-img src="https://example.com/photo.jpg" alt="A photo" width="640" height="480"></amp-img>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('<img')
    expect(result).toContain('src="https://example.com/photo.jpg"')
    expect(result).not.toContain('amp-img')
  })

  it('should canonicalize an alignment class into data-align', async () => {
    const value = '<img class="aligncenter" src="https://example.com/a.jpg">'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('data-align="center"')
  })

  it('should promote style dimensions to width and height attributes', async () => {
    const value = '<img src="https://example.com/photo.jpg" style="width:300px;height:200px">'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('width="300"')
    expect(result).toContain('height="200"')
  })

  it('should linkify a bare url in text', async () => {
    const value = '<p>See https://example.com/page for details</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('<a href="https://example.com/page"')
  })

  it('should mark a line-leading timestamp', async () => {
    const value = '<p>01:21 - Intro</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('<span data-timestamp="81">01:21</span>')
  })

  // A javascript: anchor is unwrapped by stripDeadAnchors before neutralizeUnsafeUrls
  // runs, so the pipeline outcome for links is removal, not the sentinel.
  it('should unwrap an unsafe link and keep its text', async () => {
    const value = '<p><a href="javascript:alert(1)">x</a></p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('x')
    expect(result).not.toContain('javascript:')
    expect(result).not.toContain('<a')
  })

  it('should neutralize an unsafe image src to the media sentinel', async () => {
    const value = '<p>Text</p><img src="javascript:alert(1)">'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('src="about:blank"')
    expect(result).not.toContain('javascript:')
  })

  it('should wrap a table in a scroll container', async () => {
    const value = '<table><tbody><tr><td>Cell</td></tr></tbody></table>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('data-table')
    expect(result).toContain('<table>')
  })

  it('should demote a lone h1 to h2', async () => {
    const value = '<h1>Section</h1><p>Body</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('<h2>Section</h2>')
    expect(result).not.toContain('<h1>')
  })

  it.todo('should strip control characters from the raw input', () => {
    // Raw content with C0 control chars (e.g. \u0008) should come out without them.
  })

  it.todo('should unwrap bare CDATA markers around content', () => {
    // Content wrapped in literal <![CDATA[ ... ]]> markers should render as HTML.
  })

  it.todo('should surface an embed hidden in a template element', () => {
    // A <template> holding an iframe embed should end up as a visible placeholder.
  })

  it.todo('should surface an embed hidden in a noscript element', () => {
    // A <noscript> fallback iframe should be promoted and placeholdered.
  })

  it.todo('should rebuild a lite-youtube facade into an embed placeholder', () => {
    // A <lite-youtube videoid> facade should produce a youtube data-embed-* placeholder.
  })

  it.todo('should rebuild a lazyYT facade into an embed placeholder', () => {
    // A .lazyYT div with data-youtube-id should produce a youtube placeholder.
  })

  it.todo('should rebuild a WP Rocket youtube preview into an embed placeholder', () => {
    // A .rll-youtube-player div with data-src should produce a youtube placeholder.
  })

  it.todo('should rebuild a Wistia embed into an embed placeholder', () => {
    // A .wistia_embed div should produce an embed placeholder for the wistia player.
  })

  it.todo('should rebuild a Lyte embed into an embed placeholder', () => {
    // A .lyte-wrapper facade should produce a youtube placeholder.
  })

  it.todo('should rebuild an Embed Plus embed into an embed placeholder', () => {
    // An Embed Plus wrapper should produce a youtube placeholder.
  })

  it.todo('should rebuild an Elementor video facade into an embed placeholder', () => {
    // An .elementor-video div carrying settings JSON should produce a placeholder.
  })

  it.todo('should rebuild a lazyload video iframe into an embed placeholder', () => {
    // An iframe with class lazyload and data-src should resolve and placeholder.
  })

  it.todo('should wrap Cargo portfolio images in figures', () => {
    // Cargo image runs should become sibling figures, not one glued paragraph.
  })

  it.todo('should unwrap a doubly nested list', () => {
    // <ul><ul><li> nesting from broken exporters should flatten one level.
  })

  it.todo('should unwrap bold-only heading content', () => {
    // <h2><strong>Title</strong></h2> should lose the redundant strong wrapper.
  })

  it.todo('should convert a lazy image container into an image', () => {
    // A media-less div carrying an image-shaped lazy src should become an <img>.
  })

  it.todo('should recover the real src on a lazy video element', () => {
    // A <video data-src> should have src promoted before URL passes run.
  })

  it.todo('should recover the real src on a lazy audio element', () => {
    // An <audio data-src> should have src promoted before URL passes run.
  })

  it.todo('should hoist a figcaption out of a wrapping anchor', () => {
    // <a><img><figcaption></a> should end with the caption outside the anchor.
  })

  it.todo('should shorten a same-page link to its bare fragment', () => {
    // An absolute self-URL href ending in #section should become href="#section".
  })

  it.todo('should normalize an anchored heading into a self-linking permalink', () => {
    // A heading with an id/anchor should carry the canonical empty self-link anchor.
  })

  it.todo('should unwrap a dead anchor without an href target', () => {
    // An <a> with no href (or #-only) should be unwrapped, keeping its text.
  })

  it.todo('should empty a lone-backslash paragraph', () => {
    // <p>\</p> from markdown escape leaks should be removed entirely.
  })

  it.todo('should convert a double br run into a paragraph break', () => {
    // Text<br><br>Text should become two paragraphs.
  })

  it.todo('should unwrap a code element nested in another code element', () => {
    // <pre><code><code> nesting should collapse to a single code block.
  })

  it.todo('should strip uniform leading indentation from a plain block', () => {
    // Consistently indented plain-text lines should lose the shared indent.
  })

  it.todo('should strip a br between two block elements', () => {
    // <p>a</p><br><p>b</p> should lose the inter-block br.
  })

  it.todo('should merge a list fragmented across consecutive containers', () => {
    // Two adjacent <ul>s split by an exporter should merge into one list.
  })

  it.todo('should merge consecutive one-liner pre blocks', () => {
    // Adjacent single-line <pre> blocks from line-by-line exporters should merge.
  })

  it.todo('should trim leading and trailing blank lines inside pre', () => {
    // A <pre> padded with blank first/last lines should lose the padding.
  })

  it.todo('should promote a lazy iframe src before embed resolution', () => {
    // An iframe with only data-src should still produce an embed placeholder.
  })

  it.todo('should assign a poster to a bare video when heuristics are enabled', () => {
    // With heuristics: true, a poster-less <video> near a content image should
    // receive that image as its poster.
  })

  // unwrapHeadingBold runs late so it judges the heading by its final content. These pin
  // the ordering: each heading carries junk beside the bold that an intermediate transform
  // removes, so with the unwrap placed early the bold only came off on a second run.
  it('should unwrap the heading bold once junk siblings are cleaned', async () => {
    const options = { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' }
    const value = html`
      <h2><a href="https://example.com/post#anchored"><strong>Anchored</strong></a></h2>
      <h3><strong>Shared</strong><span class="sharedaddy">Share this</span></h3>
    `
    const result = await transformContent(value, options)

    expect(result).not.toContain('<strong>')
    expect(await transformContent(result, options)).toBe(result)
  })

  // Every transform has its own idempotency case, but nothing pinned the pipeline as a
  // whole, which is where the placeholder shapes drifted: an embed placeholder is built
  // after wrapBareInlineInParagraphs and a cite placeholder before it, so re-running the
  // pipeline used to wrap the embed's fallback link and change the output.
  it('should be idempotent for embed and cite placeholders', async () => {
    const options = { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' }
    const value = html`
      <p>Intro</p>
      <iframe src="https://www.youtube.com/embed/abc123"></iframe>
      <figure class="kg-card kg-bookmark-card">
        <a class="kg-bookmark-container" href="https://example.com/linked">
          <div class="kg-bookmark-content">
            <div class="kg-bookmark-title">Linked post</div>
          </div>
        </a>
      </figure>
    `
    const once = await transformContent(value, options)
    const twice = await transformContent(once, options)

    expect(once).toContain('data-embed-src=')
    expect(once).toContain('data-cite-provider="ghost"')
    expect(twice).toBe(once)
  })
})
