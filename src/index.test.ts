import { describe, expect, it } from 'bun:test'
import { defaultStandardDomTransforms } from './defaults.js'
import { transformContent } from './index.js'
import { describeForEachParser, html, substackAttrs } from './tests.js'
import { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'

const lineBreakAfterBraceRegex = /\{\n\s+/
const blockInParagraphRegex = /<p[^>]*>(?:[^<]|<(?!\/p>|p[\s>]))*<(?:div|pre|figure|table)[\s>]/

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

  it('should keep the break after a custom emoji image', async () => {
    const value = html`
      <p>
        Nice
        <img src="https://mastodon.example/custom_emojis/images/blob.png" alt=":blob:">
        <br>
        Have fun!
      </p>
    `
    const expected = html`
      <p>
        Nice
        <img src="https://mastodon.example/custom_emojis/images/blob.png" alt=":blob:" data-emoji="">
        <br>
        Have fun!
      </p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
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

  it('should allow custom widgetResolvers', async () => {
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
      widgetResolvers: [
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

  // Where each Substack component ends up under the default pipeline. Most are owned by a
  // generic pass rather than a Substack-specific one, so without these cases a delegation
  // would read as a coverage gap. Fixtures are real feed markup, anonymized. Census rows
  // that are not Substack components (other CMSes reuse data-component-name) and Substack's
  // own error and fragment internals (AssetErrorToDOM, FragmentNodeToDOM) are excluded.
  describe('Platform e2e: Substack', () => {
    const uploadId = 'de58e4a3-5505-45a7-8abc-b46c5c0f6e7a'
    const lightboxHref =
      'https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d_1200x864.png'
    const renditionSrc =
      'https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d_1200x864.png'

    it('should keep a populated Image2ToDOM anchor as a dimensioned, proxied image', async () => {
      // The generic image pipeline owns it: unwrapWrappers dissolves the containers,
      // stripNonContentElements drops the restack chrome, proxyAssetUrls rewrites the src.
      const value = html`
        <div class="captioned-image-container">
          <figure>
            <a
              class="image-link image2 is-viewable-img"
              target="_blank"
              href="${lightboxHref}"
              data-component-name="Image2ToDOM"
            >
              <div class="image2-inset">
                <img
                  src="${renditionSrc}"
                  width="1200"
                  height="864"
                  class="sizing-normal"
                  alt=""
                >
                <div class="image-link-expand">
                  <button type="button" class="pencraft icon-container restack-image"></button>
                </div>
              </div>
            </a>
            <figcaption class="image-caption">The caption</figcaption>
          </figure>
        </div>
      `
      const expected = html`
        <figure>
          <a
            class="image-link image2 is-viewable-img"
            target="_blank"
            href="${lightboxHref}"
            data-component-name="Image2ToDOM"
          >
            <img
              src="https://proxy.example.com/image/${encodeURIComponent(renditionSrc)}"
              data-proxied-src="${renditionSrc}"
              width="1200"
              height="864"
              class="sizing-normal"
              alt=""
            >
          </a>
          <figcaption class="image-caption">The caption</figcaption>
        </figure>
      `
      const result = await transformContent(value, {
        parseHtmlFn: parseHtml,
        assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
      })

      expect(result).toEqualHtml(expected)
    })

    it('should recover an emptied Image2ToDOM anchor as an image minted from its href', async () => {
      // fixSubstackImageLinks owns it: the anchor arrives with its <img> child stripped.
      const value = html`
        <figure>
          <a
            class="image-link image2 is-viewable-img"
            target="_blank"
            href="${lightboxHref}"
            data-component-name="Image2ToDOM"
          ></a>
        </figure>
      `
      const expected = html`
        <figure>
          <a
            class="image-link image2 is-viewable-img"
            target="_blank"
            href="${lightboxHref}"
            data-component-name="Image2ToDOM"
          >
            <img src="${lightboxHref}" width="1200" height="864">
          </a>
        </figure>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should convert a VideoPlaceholder upload into a native video element', async () => {
      // substackMediaResolver owns it, minting the api.substack.com upload endpoint.
      const videoAttrs = substackAttrs({
        mediaUploadId: uploadId,
        duration: null,
        isEditorNode: true,
      })
      const value = html`
        <div
          class="native-video-embed"
          data-attrs="${videoAttrs}"
          data-component-name="VideoPlaceholder"
        ></div>
        <p>The talk in full.</p>
      `
      const expected = html`
        <video src="https://api.substack.com/api/v1/video/upload/${uploadId}/src" controls></video>
        <p>The talk in full.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should convert an AudioPlaceholder upload into a native audio element', async () => {
      // substackMediaResolver owns it, through the same upload endpoint as video.
      const audioAttrs = substackAttrs({
        label: '',
        mediaUploadId: uploadId,
        duration: 714.031,
        downloadable: false,
        isEditorNode: true,
      })
      const value = html`
        <div
          class="native-audio-embed"
          data-component-name="AudioPlaceholder"
          data-attrs="${audioAttrs}"
        ></div>
        <p>Interview companion audio.</p>
      `
      const expected = html`
        <audio src="https://api.substack.com/api/v1/video/upload/${uploadId}/src" controls></audio>
        <p>Interview companion audio.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should resolve a Youtube2ToDOM wrap into a youtube embed placeholder', async () => {
      // The host-keyed youtube resolver claims the inner iframe; the wrap divs dissolve.
      const youtubeAttrs = substackAttrs({
        videoId: 'ab3DEfGHijk',
        startTime: null,
        endTime: null,
      })
      const value = html`
        <div
          id="youtube2-ab3DEfGHijk"
          class="youtube-wrap"
          data-attrs="${youtubeAttrs}"
          data-component-name="Youtube2ToDOM"
        >
          <div class="youtube-inner">
            <iframe
              src="https://www.youtube-nocookie.com/embed/ab3DEfGHijk?rel=0&amp;autoplay=0&amp;showinfo=0&amp;enablejsapi=0"
              frameborder="0"
              loading="lazy"
              gesture="media"
              allow="autoplay; fullscreen"
              allowautoplay="true"
              allowfullscreen="true"
              width="728"
              height="409"
            ></iframe>
          </div>
        </div>
      `
      const expected = html`
        <div
          data-embed-provider="youtube"
          data-embed-id="ab3DEfGHijk"
          data-embed-src="https://www.youtube.com/embed/ab3DEfGHijk"
          data-embed-url="https://www.youtube.com/watch?v=ab3DEfGHijk"
          data-embed-thumbnail="https://i.ytimg.com/vi/ab3DEfGHijk/hqdefault.jpg"
          data-embed-width="728"
          data-embed-height="409"
        >
          <a href="https://www.youtube.com/watch?v=ab3DEfGHijk">https://www.youtube.com/watch?v=ab3DEfGHijk</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should resolve a spotify-wrap iframe into a spotify embed placeholder', async () => {
      // The url-keyed spotify resolver claims the iframe; its declared height wins.
      const episodeAttrs = substackAttrs({
        image: 'https://i.scdn.co/image/ab6765630000ba8a0000000000000000000000ff',
        title: 'Episode 42: Field Recording',
        subtitle: 'Casey Host',
        description: 'Episode',
        url: 'https://open.spotify.com/episode/aB3dEfGhIjKlMnOpQrStUv',
        belowTheFold: true,
        noScroll: false,
      })
      const value = html`
        <iframe
          class="spotify-wrap podcast"
          data-attrs="${episodeAttrs}"
          src="https://open.spotify.com/embed/episode/aB3dEfGhIjKlMnOpQrStUv"
          frameborder="0"
          gesture="media"
          allowfullscreen="true"
          width="100%"
          height="232"
        ></iframe>
      `
      const expected = html`
        <div
          data-embed-provider="spotify"
          data-embed-id="episode/aB3dEfGhIjKlMnOpQrStUv"
          data-embed-src="https://open.spotify.com/embed/episode/aB3dEfGhIjKlMnOpQrStUv"
          data-embed-url="https://open.spotify.com/episode/aB3dEfGhIjKlMnOpQrStUv"
          data-embed-height="232"
        >
          <a
            href="https://open.spotify.com/episode/aB3dEfGhIjKlMnOpQrStUv"
          >https://open.spotify.com/episode/aB3dEfGhIjKlMnOpQrStUv</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should rebuild a MentionToDOM span into an inline profile link', async () => {
      // fixSubstackMentions owns it: the name lives only in the data-attrs JSON.
      const mentionAttrs = substackAttrs({
        name: 'Jane Miller',
        id: 123456,
        type: 'user',
        url: null,
      })
      const mention = `<span class="mention-wrap" data-attrs="${mentionAttrs}" data-component-name="MentionToDOM"></span>`
      const value = html`<p>Thanks to ${mention} for the idea.</p>`
      const expected = html`
        <p>Thanks to <a href="https://substack.com/profile/123456">@Jane Miller</a> for the idea.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should convert an EmbeddedPostToDOM cross-post card into a cite placeholder', async () => {
      // substackCrossPostCiteResolver owns it in the cite pass.
      const crossPostAttrs = substackAttrs({
        id: 203084323,
        url: 'https://otherpub.substack.com/p/field-notes-23',
        publication_id: 6115088,
        publication_name: 'Other Pub',
        publication_logo_url:
          'https://substackcdn.com/image/fetch/f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Flogo_1080x1080.png',
        title: 'Field Notes #23',
        truncated_body_text: 'The preview text.',
        date: '2026-06-22T13:20:17.562Z',
        like_count: 7,
        comment_count: 1,
        bylines: [
          {
            id: 1,
            name: 'Casey Author',
            photo_url: 'https://substack-post-media.s3.amazonaws.com/public/images/photo.jpeg',
          },
        ],
      })
      const value = html`
        <p>Intro</p>
        <div
          class="embedded-post-wrap"
          data-attrs="${crossPostAttrs}"
          data-component-name="EmbeddedPostToDOM"
        ></div>
      `
      const expected = html`
        <p>Intro</p>
        <div
          data-cite-provider="substack"
          data-cite-description="The preview text."
          data-cite-author="Casey Author"
          data-cite-publisher="Other Pub"
          data-cite-date="2026-06-22T13:20:17.562Z"
          data-cite-url="https://otherpub.substack.com/p/field-notes-23"
          data-cite-title="Field Notes #23"
          data-cite-icon="https://substackcdn.com/image/fetch/f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Flogo_1080x1080.png"
        >
          <a href="https://otherpub.substack.com/p/field-notes-23">Field Notes #23</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should convert a DigestPostEmbed own-post card into a cite placeholder', async () => {
      // substackOwnPostCiteResolver owns it in the cite pass.
      const ownPostAttrs = substackAttrs({
        nodeId: 1,
        title: 'Model Drop',
        caption: 'The excerpt of the linked post.',
        canonical_url: 'https://examplepub.substack.com/p/model-drop',
        publishedBylines: [{ name: 'Casey Author' }],
      })
      const value = html`
        <div
          class="digest-post-embed"
          data-attrs="${ownPostAttrs}"
          data-component-name="DigestPostEmbed"
        ></div>
      `
      const expected = html`
        <div
          data-cite-provider="substack"
          data-cite-description="The excerpt of the linked post."
          data-cite-author="Casey Author"
          data-cite-url="https://examplepub.substack.com/p/model-drop"
          data-cite-title="Model Drop"
        >
          <a href="https://examplepub.substack.com/p/model-drop">Model Drop</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should strip a SubscribeWidgetToDOM widget as non-content', async () => {
      // nonContentSelectors owns it (.subscription-widget-wrap-editor): a subscribe CTA is
      // chrome, so removal is the desired end state.
      const subscribeAttrs = substackAttrs({
        url: 'https://examplepub.substack.com/subscribe?',
        text: 'Subscribe',
        language: 'en',
      })
      const value = html`
        <p>Thank you for being here.</p>
        <div
          class="subscription-widget-wrap-editor"
          data-attrs="${subscribeAttrs}"
          data-component-name="SubscribeWidgetToDOM"
        >
          <div class="subscription-widget show-subscribe">
            <div class="preamble">
              <p class="cta-caption">Subscribe for free to receive new posts.</p>
            </div>
            <form class="subscription-widget-subscribe">
              <input type="email" placeholder="Type your email...">
              <input type="submit" value="Subscribe">
            </form>
          </div>
        </div>
      `
      const expected = html`<p>Thank you for being here.</p>`
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop DirectMessageToDOM and CommunityChatRenderPlaceholder divs', async () => {
      // stripEmptyTags owns them: both ship childless, hold no content to recover, and
      // point at interactions that only work on Substack, so removal is the desired end state.
      const directMessageAttrs = substackAttrs({
        userId: 123456,
        userName: 'Sam Fields',
        canDm: null,
        dmUpgradeOptions: null,
        isEditorNode: true,
      })
      const communityChatAttrs = substackAttrs({
        url: 'https://open.substack.com/pub/examplepub/chat?utm_source=chat_embed',
        subdomain: 'examplepub',
      })
      const value = html`
        <p>Come say hi.</p>
        <div
          class="directMessage button"
          data-attrs="${directMessageAttrs}"
          data-component-name="DirectMessageToDOM"
        ></div>
        <div
          class="community-chat"
          data-attrs="${communityChatAttrs}"
          data-component-name="CommunityChatRenderPlaceholder"
        ></div>
      `
      const expected = html`<p>Come say hi.</p>`
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep a standalone ButtonCreateButton paragraph untouched', async () => {
      // Passes through: no selector claims the bare CTA paragraph, so the subscribe button
      // link survives outside a captioned-button wrap.
      const buttonAttrs = substackAttrs({
        url: 'https://examplepub.substack.com/subscribe?',
        text: 'Subscribe now',
        action: null,
        class: null,
      })
      const value = html`
        <p>Please feel free to share this.</p>
        <p
          class="button-wrapper"
          data-attrs="${buttonAttrs}"
          data-component-name="ButtonCreateButton"
        ><a class="button primary" href="https://examplepub.substack.com/subscribe?"><span>Subscribe now</span></a></p>
      `
      const expected = value
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should strip a CaptionedButtonToDOM CTA with its inner button', async () => {
      // nonContentSelectors owns it (.captioned-button-wrap): caption and button are chrome.
      const captionedAttrs = substackAttrs({
        url: 'https://examplepub.substack.com/p/the-post?action=share',
        text: 'Share',
      })
      const value = html`
        <p>Before.</p>
        <div
          class="captioned-button-wrap"
          data-attrs="${captionedAttrs}"
          data-component-name="CaptionedButtonToDOM"
        >
          <div class="preamble">
            <p class="cta-caption">Thanks for reading! This post is public so feel free to share it.</p>
          </div>
          <p
            class="button-wrapper"
            data-attrs="${captionedAttrs}"
            data-component-name="ButtonCreateButton"
          ><a class="button primary" href="https://examplepub.substack.com/p/the-post?action=share"><span>Share</span></a></p>
        </div>
      `
      const expected = html`<p>Before.</p>`
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep FootnoteAnchorToDOM and FootnoteToDOM as plain in-page links', async () => {
      // Passes through: the footnote kind is parked, so the anchor stays inline and the
      // footnote body unwraps into ordinary paragraphs that keep the back link.
      const value = html`
        <p>A claim in the body.<a class="footnote-anchor" data-component-name="FootnoteAnchorToDOM" id="footnote-anchor-1" href="#footnote-1" target="_self">1</a></p>
        <div class="footnote" data-component-name="FootnoteToDOM">
          <a id="footnote-1" href="#footnote-anchor-1" class="footnote-number" contenteditable="false" target="_self">1</a>
          <div class="footnote-content"><p>The footnote text.</p></div>
        </div>
      `
      const expected = html`
        <p>A claim in the body.<a class="footnote-anchor" data-component-name="FootnoteAnchorToDOM" id="footnote-anchor-1" href="#footnote-1" target="_self">1</a></p>
        <p><a id="footnote-1" href="#footnote-anchor-1" class="footnote-number" contenteditable="false" target="_self">1</a></p>
        <p>The footnote text.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep a PreformattedTextBlockToDOM pre and leak its editor label', async () => {
      // Known leak: the "maintain its original spacing" editor label is not in
      // nonContentSelectors, so it survives as a paragraph above the pre.
      const value = `<div class="preformatted-block" data-component-name="PreformattedTextBlockToDOM"><label class="hide-text" contenteditable="false">Text within this block will maintain its original spacing when published</label><pre class="text">Moving about in worlds not realised,\n     High instincts before which our mortal Nature</pre></div>`
      const expected = `<p><label class="hide-text" contenteditable="false">Text within this block will maintain its original spacing when published</label></p><pre class="text"><code>Moving about in worlds not realised,\n     High instincts before which our mortal Nature</code></pre>`
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should highlight a HighlightedCodeBlockToDOM block through the code pipeline', async () => {
      // highlightCode owns it: the declared language becomes the pre label and hljs markup.
      const codeAttrs = substackAttrs({
        language: 'markdown',
        nodeId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      })
      const value = `<div
        class="highlighted_code_block"
        data-attrs="${codeAttrs}"
        data-component-name="HighlightedCodeBlockToDOM"
      ><pre class="shiki"><code class="language-markdown">- [ ] Onboarding form\n- [ ] Wins feed</code></pre></div>`
      const expected = `<pre data-pre-label="Markdown" data-pre-language="markdown" class="shiki"><code class="language-markdown hljs"><span class="hljs-bullet">-</span> [ ] Onboarding form\n<span class="hljs-bullet">-</span> [ ] Wins feed</code></pre>`
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep a GitgistToDOM inline gist as a scrollable table', async () => {
      // Passes through: wrapTablesForScroll owns the code table, and the stylesheet link and
      // the gist-meta line survive as they arrive.
      const gistAttrs = substackAttrs({
        innerHTML: '<div id="gist100200300" class="gist"></div>',
        stylesheet: 'https://github.githubassets.com/assets/gist-embed-b1ee75c43dbe.css',
      })
      const value = html`
        <div
          class="github-gist"
          data-attrs="${gistAttrs}"
          data-component-name="GitgistToDOM"
        >
          <link rel="stylesheet" href="https://github.githubassets.com/assets/gist-embed-b1ee75c43dbe.css">
          <div id="gist100200300" class="gist">
            <div class="gist-file">
              <div class="gist-data">
                <table class="highlight"><tbody><tr><td class="blob-code">print("hello")</td></tr></tbody></table>
              </div>
              <div class="gist-meta">
                <a href="https://gist.github.com/caseyauthor/abc123/raw/">view raw</a>
                hosted with ❤ by <a href="https://github.com">GitHub</a>
              </div>
            </div>
          </div>
        </div>
      `
      const expected = html`
        <link rel="stylesheet" href="https://github.githubassets.com/assets/gist-embed-b1ee75c43dbe.css">
        <div data-table="">
          <table class="highlight"><tbody><tr><td class="blob-code">print("hello")</td></tr></tbody></table>
        </div>
        <p><a href="https://gist.github.com/caseyauthor/abc123/raw/">view raw</a> hosted with ❤ by <a href="https://github.com">GitHub</a></p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should unwrap a FileToDOM attachment card into its text and download links', async () => {
      // Passes through: the file kind is parked, so the card dissolves into paragraphs that
      // keep the file name, size line and both download links.
      const value = html`
        <p>Before.</p>
        <div class="file-embed-wrapper" data-component-name="FileToDOM">
          <div class="file-embed-container-reader">
            <div class="file-embed-container-top">
              <div class="file-embed-details">
                <div class="file-embed-details-h1">Three Poems</div>
                <div class="file-embed-details-h2">31.9KB ∙ PDF file</div>
              </div>
              <a
                class="file-embed-button wide"
                href="https://examplepub.substack.com/api/v1/file/2b9c5d1e-4f3a-4b6c-8d7e-9f0a1b2c3d4e.pdf"
              ><span class="file-embed-button-text">Download</span></a>
            </div>
            <a
              class="file-embed-button narrow"
              href="https://examplepub.substack.com/api/v1/file/2b9c5d1e-4f3a-4b6c-8d7e-9f0a1b2c3d4e.pdf"
            ><span class="file-embed-button-text">Download</span></a>
          </div>
        </div>
      `
      const expected = html`
        <p>Before.</p>
        <p>Three Poems</p>
        <p>31.9KB ∙ PDF file</p>
        <p><a class="file-embed-button wide" href="https://examplepub.substack.com/api/v1/file/2b9c5d1e-4f3a-4b6c-8d7e-9f0a1b2c3d4e.pdf"><span class="file-embed-button-text">Download</span></a></p>
        <p><a class="file-embed-button narrow" href="https://examplepub.substack.com/api/v1/file/2b9c5d1e-4f3a-4b6c-8d7e-9f0a1b2c3d4e.pdf"><span class="file-embed-button-text">Download</span></a></p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should resolve a VimeoToDOM wrap into a vimeo embed placeholder', async () => {
      // The vimeo resolver claims the inner player iframe; the wrap divs dissolve.
      const vimeoAttrs = substackAttrs({
        videoId: '123456789',
        videoKey: '',
        belowTheFold: false,
      })
      const value = html`
        <div
          id="vimeo-123456789"
          class="vimeo-wrap"
          data-attrs="${vimeoAttrs}"
          data-component-name="VimeoToDOM"
        >
          <div class="vimeo-inner">
            <iframe
              src="https://player.vimeo.com/video/123456789?autoplay=0"
              frameborder="0"
              gesture="media"
              allow="autoplay; fullscreen"
              allowautoplay="true"
              allowfullscreen="true"
            ></iframe>
          </div>
        </div>
      `
      const expected = html`
        <div
          data-embed-provider="vimeo"
          data-embed-id="123456789"
          data-embed-src="https://player.vimeo.com/video/123456789"
          data-embed-url="https://vimeo.com/123456789"
        >
          <a href="https://vimeo.com/123456789">https://vimeo.com/123456789</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should resolve an ApplePodcastToDom iframe into an applepodcasts placeholder', async () => {
      // The apple resolver claims the embed iframe and states the episode player height.
      const podcastAttrs = substackAttrs({
        url: 'https://embed.podcasts.apple.com/au/podcast/the-art-of/id1234567890?i=1000500600700',
        isEpisode: true,
        imageUrl:
          'https://substack-post-media.s3.amazonaws.com/public/images/podcast-episode_1000500600700.jpg',
        title: 'The art of storytelling',
        podcastTitle: 'Example Show',
        podcastByline: '',
        duration: 4419000,
        numEpisodes: '',
        targetUrl:
          'https://podcasts.apple.com/au/podcast/the-art-of/id1234567890?i=1000500600700&uo=4',
        releaseDate: '2021-04-04T14:51:00Z',
      })
      const value = html`
        <div class="apple-podcast-container" data-component-name="ApplePodcastToDom">
          <iframe
            class="apple-podcast "
            data-attrs="${podcastAttrs}"
            src="https://embed.podcasts.apple.com/au/podcast/the-art-of/id1234567890?i=1000500600700"
          ></iframe>
        </div>
      `
      const expected = html`
        <div
          data-embed-provider="applepodcasts"
          data-embed-id="podcast/1000500600700"
          data-embed-src="https://embed.podcasts.apple.com/au/podcast/the-art-of/id1234567890?i=1000500600700"
          data-embed-url="https://podcasts.apple.com/au/podcast/the-art-of/id1234567890?i=1000500600700"
          data-embed-height="175"
        >
          <a
            href="https://podcasts.apple.com/au/podcast/the-art-of/id1234567890?i=1000500600700"
          >https://podcasts.apple.com/au/podcast/the-art-of/id1234567890?i=1000500600700</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should convert a DatawrapperToDOM chart into its static image', async () => {
      // convertDatawrapperEmbeds owns the iframe; the sibling resize script passes through
      // for the reader to drop.
      const chartAttrs = substackAttrs({
        url: 'https://datawrapper.dwcdn.net/aB1cD/2/',
        thumbnail_url: 'https://substack-post-media.s3.amazonaws.com/public/images/a_1220x1742.png',
        height: 536,
        title: 'Market power state ranking',
        description: '',
      })
      const value = html`
        <div
          class="datawrapper-wrap"
          data-attrs="${chartAttrs}"
          data-component-name="DatawrapperToDOM"
        >
          <iframe
            id="iframe-datawrapper"
            class="datawrapper-iframe"
            src="https://datawrapper.dwcdn.net/aB1cD/2/"
            width="730"
            height="536"
            frameborder="0"
            scrolling="no"
          ></iframe>
          <script type="text/javascript">!function(){"use strict";window.addEventListener("message",(function(e){}))}();</script>
        </div>
      `
      const expected = html`
        <a href="https://datawrapper.dwcdn.net/aB1cD/"><img src="https://datawrapper.dwcdn.net/aB1cD/full.png"></a>
        <p><script type="text/javascript">!function(){"use strict";window.addEventListener("message",(function(e){}))}();</script></p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should resolve a BandcampToDOM wrap into a bandcamp embed placeholder', async () => {
      // The bandcamp resolver claims the player iframe and keeps the publisher's size preset.
      const bandcampAttrs = substackAttrs({
        url: 'https://examplelabel.bandcamp.com/track/end-credits',
        thumbnail_url: 'https://substack-post-media.s3.amazonaws.com/public/images/b_700x700.jpeg',
        author: 'Example Band',
        embed_url:
          'https://bandcamp.com/EmbeddedPlayer/size=large/bgcol=ffffff/linkcol=333333/tracklist=false/artwork=small/track=1234567890/transparent=true/',
        is_album: false,
      })
      const value = html`
        <div
          class="bandcamp-wrap"
          data-attrs="${bandcampAttrs}"
          data-component-name="BandcampToDOM"
        >
          <iframe
            src="https://bandcamp.com/EmbeddedPlayer/size=large/bgcol=ffffff/linkcol=333333/tracklist=false/artwork=small/track=1234567890/transparent=true/"
            frameborder="0"
            gesture="media"
            scrolling="no"
            allowfullscreen="true"
          ></iframe>
        </div>
      `
      const expected = html`
        <div
          data-embed-provider="bandcamp"
          data-embed-id="track/1234567890"
          data-embed-src="https://bandcamp.com/EmbeddedPlayer/track=1234567890/size=large/"
          data-embed-height="470"
        >
          <a
            href="https://bandcamp.com/EmbeddedPlayer/track=1234567890/size=large/"
          >https://bandcamp.com/EmbeddedPlayer/track=1234567890/size=large/</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should resolve a SoundcloudToDOM wrap into a soundcloud embed placeholder', async () => {
      // The soundcloud resolver claims the player iframe and reads the track id off its url.
      const soundcloudAttrs = substackAttrs({
        title: 'Mix 4',
        description: 'Tracklist',
        thumbnail_url: 'https://i1.sndcdn.com/artworks-abc-t500x500.jpg',
        author_name: 'Example Radio',
        author_url: 'https://soundcloud.com/exampleradio',
        targetUrl: 'https://soundcloud.com/exampleradio/mix-4',
      })
      const value = html`
        <div
          class="soundcloud-wrap"
          data-attrs="${soundcloudAttrs}"
          data-component-name="SoundcloudToDOM"
        >
          <iframe
            src="https://w.soundcloud.com/player/?auto_play=false&buying=false&liking=false&download=false&sharing=false&show_artwork=true&show_comments=false&show_playcount=false&show_user=true&hide_related=true&visual=false&start_track=0&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123456789"
            frameborder="0"
            gesture="media"
            scrolling="no"
            allowfullscreen="true"
          ></iframe>
        </div>
      `
      const expected = html`
        <div
          data-embed-provider="soundcloud"
          data-embed-id="tracks/123456789"
          data-embed-src="https://w.soundcloud.com/player/?auto_play=false&buying=false&liking=false&download=false&sharing=false&show_artwork=true&show_comments=false&show_playcount=false&show_user=true&hide_related=true&visual=false&start_track=0&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123456789"
          data-embed-height="166"
        >
          <a
            href="https://w.soundcloud.com/player/?auto_play=false&buying=false&liking=false&download=false&sharing=false&show_artwork=true&show_comments=false&show_playcount=false&show_user=true&hide_related=true&visual=false&start_track=0&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123456789"
          >https://w.soundcloud.com/player/?auto_play=false&buying=false&liking=false&download=false&sharing=false&show_artwork=true&show_comments=false&show_playcount=false&show_user=true&hide_related=true&visual=false&start_track=0&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123456789</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should fall back the TikTok embed pair to a generic placeholder and its static link', async () => {
      // The generic iframe fallback owns the iframely player (no tiktok resolver claims it),
      // the hidden cookie-check iframe is stripped, and the static thumbnail link survives.
      const tiktokAttrs = substackAttrs({
        url: 'https://www.tiktok.com/@caseyhandle/video/7123456789012345678',
        thumbnail_url:
          'https://substack-post-media.s3.amazonaws.com/public/images/b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e_1080x1920.jpeg',
        author: 'Casey Maker',
        embed_url:
          'https://cdn.iframe.ly/api/iframe?media=1&app=1&url=https%3A%2F%2Fwww.tiktok.com%2F%40caseyhandle%2Fvideo%2F7123456789012345678&key=abc123',
        author_url: 'https://www.tiktok.com/@caseyhandle',
        belowTheFold: true,
      })
      const value = html`
        <div
          class="tiktok-wrap"
          data-attrs="${tiktokAttrs}"
          data-component-name="TikTokCreateTikTokEmbed"
        >
          <iframe
            id="iframe-tiktok-1"
            class="tiktok-iframe"
            src="https://cdn.iframe.ly/api/iframe?media=1&app=1&url=https%3A%2F%2Fwww.tiktok.com%2F%40caseyhandle%2Fvideo%2F7123456789012345678&key=abc123"
            frameborder="0"
            allow="autoplay; fullscreen; encrypted-media"
            allowfullscreen=""
            scrolling="no"
            loading="lazy"
          ></iframe>
          <iframe
            src="https://team-hosted-public.s3.amazonaws.com/set-then-check-cookie.html"
            id="third-party-iframe-tiktok-1"
            class="third-party-cookie-check-iframe"
            style="display: none;"
            loading="lazy"
          ></iframe>
          <div class="tiktok-wrap static" data-component-name="TikTokCreateStaticTikTokEmbed">
            <a href="https://www.tiktok.com/@caseyhandle/video/7123456789012345678" target="_blank">
              <img
                class="tiktok thumbnail"
                src="https://substackcdn.com/image/fetch/w_640,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fb2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e_1080x1920.jpeg"
              >
            </a>
          </div>
        </div>
      `
      const expected = html`
        <div
          data-embed-src="https://cdn.iframe.ly/api/iframe?media=1&app=1&url=https%3A%2F%2Fwww.tiktok.com%2F%40caseyhandle%2Fvideo%2F7123456789012345678&key=abc123"
        >
          <a
            href="https://cdn.iframe.ly/api/iframe?media=1&app=1&url=https%3A%2F%2Fwww.tiktok.com%2F%40caseyhandle%2Fvideo%2F7123456789012345678&key=abc123"
          >https://cdn.iframe.ly/api/iframe?media=1&amp;app=1&amp;url=https%3A%2F%2Fwww.tiktok.com%2F%40caseyhandle%2Fvideo%2F7123456789012345678&amp;key=abc123</a>
        </div>
        <a href="https://www.tiktok.com/@caseyhandle/video/7123456789012345678" target="_blank">
          <img
            width="1080"
            height="1920"
            class="tiktok thumbnail"
            src="https://substackcdn.com/image/fetch/w_640,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fb2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e_1080x1920.jpeg"
          >
        </a>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should fall back a PredictionMarketToDOM iframe to a generic placeholder', async () => {
      // The generic iframe fallback owns the market iframe; its px-suffixed size attributes
      // do not survive as embed dimensions.
      const marketAttrs = substackAttrs({
        url: 'https://manifold.markets/embed/ExampleUser/will-the-thing-happen',
        thumbnail_url: 'https://substack-post-media.s3.amazonaws.com/public/images/c_600x315.png',
      })
      const value = html`
        <div
          id="prediction-market-iframe"
          class="prediction-market-wrap outer"
          data-attrs="${marketAttrs}"
          data-component-name="PredictionMarketToDOM"
        >
          <iframe
            id="iframe-prediction-market"
            class="prediction-market-iframe"
            src="https://manifold.markets/embed/ExampleUser/will-the-thing-happen"
            width="560px"
            height="405px"
            frameborder="0"
          ></iframe>
        </div>
      `
      const expected = html`
        <div data-embed-src="https://manifold.markets/embed/ExampleUser/will-the-thing-happen">
          <a
            href="https://manifold.markets/embed/ExampleUser/will-the-thing-happen"
          >https://manifold.markets/embed/ExampleUser/will-the-thing-happen</a>
        </div>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should convert a VideoEmbedPlayer web render into a native video element', async () => {
      // substackMediaResolver owns the outer native-video-embed div, so the web-render inner
      // resolves the same way as an empty VideoPlaceholder.
      const playerAttrs = substackAttrs({
        mediaUploadId: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
        duration: null,
      })
      const value = html`
        <div class="native-video-embed" data-attrs="${playerAttrs}">
          <div
            id="media-c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f"
            class="videoScrollTarget-SzB20Y"
            data-component-name="VideoEmbedPlayer"
          >
            <div class="pencraft pc-reset placeholder-ICMYsF" tabindex="-1" aria-hidden="true"></div>
          </div>
        </div>
      `
      const expected = html`
        <video src="https://api.substack.com/api/v1/video/upload/c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f/src" controls></video>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should flatten an ImageGallery into its images and caption', async () => {
      // The generic image pipeline owns it: the row divs dissolve, flattenPictureElements
      // collapses each picture, and the figure keeps its caption.
      const value = html`
        <figure class="gallery-Phxj1j" data-component-name="ImageGallery" data-drag-handle="true">
          <div class="pencraft pc-display-flex pc-flexDirection-column pc-gap-8 pc-reset">
            <div class="pencraft pc-display-flex pc-gap-8 pc-reset imageRow-_Y6x8T length-2-inHdHY">
              <picture>
                <source type="image/webp"></source>
                <img
                  alt="Flowers from a grab bag"
                  class="img-OACg1c image-IE_pDY medium-ZeIdEU zoom-YdDT6p pencraft pc-reset"
                  src="https://substackcdn.com/image/fetch/w_720,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0a1b2c3d-4e5f-4a6b-8c7d-000000000001_1200x800.jpeg"
                  width="720"
                >
              </picture>
              <picture>
                <source type="image/webp"></source>
                <img
                  alt="Flowers from a grab bag"
                  class="img-OACg1c image-IE_pDY medium-ZeIdEU zoom-YdDT6p pencraft pc-reset"
                  src="https://substackcdn.com/image/fetch/w_720,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0a1b2c3d-4e5f-4a6b-8c7d-000000000002_1200x800.jpeg"
                  width="720"
                >
              </picture>
            </div>
            <figcaption class="imageCaption-iHC8xR">Flowers from a grab bag</figcaption>
          </div>
        </figure>
      `
      const expected = html`
        <figure class="gallery-Phxj1j" data-component-name="ImageGallery" data-drag-handle="true">
          <img
            alt="Flowers from a grab bag"
            class="img-OACg1c image-IE_pDY medium-ZeIdEU zoom-YdDT6p pencraft pc-reset"
            src="https://substackcdn.com/image/fetch/w_720,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0a1b2c3d-4e5f-4a6b-8c7d-000000000001_1200x800.jpeg"
            width="720"
            height="480"
          >
          <img
            alt="Flowers from a grab bag"
            class="img-OACg1c image-IE_pDY medium-ZeIdEU zoom-YdDT6p pencraft pc-reset"
            src="https://substackcdn.com/image/fetch/w_720,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0a1b2c3d-4e5f-4a6b-8c7d-000000000002_1200x800.jpeg"
            width="720"
            height="480"
          >
          <figcaption class="imageCaption-iHC8xR">Flowers from a grab bag</figcaption>
        </figure>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep a v1 ImageToDOM img and read its extension-less dimensions', async () => {
      // resolveMediaDimensions owns it: the bare v1 img carries its size only in the
      // extension-less _WxH filename suffix.
      const value = html`
        <p>Text before. <img style="" src="https://substackcdn.com/image/fetch/w_1100,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Faa11bb22-cc33-4d44-8e55-ff6677889900_240x298" data-component-name="ImageToDOM"></p>
      `
      const expected = html`
        <p>Text before. <img width="240" height="298" src="https://substackcdn.com/image/fetch/w_1100,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Faa11bb22-cc33-4d44-8e55-ff6677889900_240x298" data-component-name="ImageToDOM"></p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep an Image2ToDOMStatic email table as a scrollable table', async () => {
      // Passes through: the email-static fossil keeps its layout table, which
      // wrapTablesForScroll wraps like any other table.
      const value = html`
        <div class="captioned-image-container-static">
          <figure>
            <table
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="image-wrapper"
              data-component-name="Image2ToDOMStatic"
              style="width: 100%;"
            >
              <tbody>
                <tr>
                  <td style="text-align: center;"></td>
                  <td align="left" class="content" style="text-align: center;" width="1178">
                    <a
                      class="image-link"
                      href="https://substack.com/redirect/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d?j=abc"
                      style="display: block;"
                      target="_blank"
                    >
                      <img
                        alt=""
                        class="wide-image"
                        src="https://substackcdn.com/image/fetch/w_1100,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b_1178x615.png"
                        width="1178"
                      >
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </figure>
        </div>
      `
      const expected = html`
        <figure>
          <div data-table="">
            <table
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="image-wrapper"
              data-component-name="Image2ToDOMStatic"
              style="width: 100%;"
            >
              <tbody>
                <tr>
                  <td style="text-align: center;"></td>
                  <td align="left" class="content" style="text-align: center;" width="1178">
                    <a
                      class="image-link"
                      href="https://substack.com/redirect/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d?j=abc"
                      style="display: block;"
                      target="_blank"
                    >
                      <img
                        alt=""
                        class="wide-image"
                        src="https://substackcdn.com/image/fetch/w_1100,c_limit,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b_1178x615.png"
                        width="1178"
                        height="615"
                      >
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </figure>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep a MentionUser anchor as the working link it already is', async () => {
      // Passes through: the web-render mention ships its own name text and profile href, so
      // fixSubstackMentions (which owns only span.mention-wrap) has nothing to recover.
      const mentionUserAttrs = substackAttrs({
        name: 'Casey Author',
        id: 123456,
        type: 'user',
        url: null,
        photo_url: 'https://substackcdn.com/image/fetch/f_auto/photo.jpeg',
        uuid: 'dd2eaf1a-f79e-4c2a-8de6-23ff6123e0ea',
      })
      const value = html`
        <p>As <span data-state="closed"><a
          class="mention-pnpTE1"
          href="https://open.substack.com/users/123456-casey-author?utm_source=mentions"
          target="_blank"
          rel="noopener"
          data-attrs="${mentionUserAttrs}"
          data-component-name="MentionUser"
        >Casey Author</a></span> wrote.</p>
      `
      const expected = value
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should strip an EmbeddedPublicationToDOMWithSubscribe promo as non-content', async () => {
      // nonContentSelectors owns it (.embedded-publication-wrap): a cross-publication
      // subscribe promo is chrome, so removal is the desired end state.
      const publicationAttrs = substackAttrs({
        url: 'https://otherpub.substack.com?utm_medium=web',
        publication_id: 1,
        name: 'Other Pub',
        hero_text: 'A newsletter.',
        author_name: 'Casey Author',
        show_subscribe: true,
        language: 'en',
      })
      const value = html`
        <p>Before.</p>
        <div
          class="embedded-publication-wrap"
          data-attrs="${publicationAttrs}"
          data-component-name="EmbeddedPublicationToDOMWithSubscribe"
        >
          <div class="embedded-publication show-subscribe">
            <a class="embedded-publication-link-part" native="true" href="https://otherpub.substack.com?utm_medium=web">
              <img class="embedded-publication-logo" src="https://substackcdn.com/image/fetch/f_auto/logo.png" width="56" height="56">
              <span class="embedded-publication-name">Other Pub</span>
              <div class="embedded-publication-hero-text">A newsletter.</div>
            </a>
          </div>
        </div>
      `
      const expected = html`<p>Before.</p>`
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should strip a web-render SubscribeWidget as non-content', async () => {
      // nonContentSelectors owns it ([data-component-name="SubscribeWidget"]): the web form
      // of the subscribe CTA carries no class the editor form shares.
      const value = html`
        <p>Before.</p>
        <div class="subscribe-widget is-signed-up is-fully-subscribed" data-component-name="SubscribeWidget">
          <p class="button-wrapper"><a class="button primary" href="https://examplepub.substack.com/subscribe"><span>Subscribe</span></a></p>
        </div>
        <p>After.</p>
      `
      const expected = html`
        <p>Before.</p>
        <p>After.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should keep an InstallSubstackAppToDOM promo, unwrapped', async () => {
      // Known leak: the app-install promo is not in nonContentSelectors, so its icon, text
      // and store link survive as unwrapped paragraphs.
      const value = html`
        <p>Before.</p>
        <div class="install-substack-app-embed install-substack-app-embed-web" data-component-name="InstallSubstackAppToDOM">
          <img class="install-substack-app-embed-img" src="https://substackcdn.com/image/fetch/f_auto/icon.png">
          <div class="install-substack-app-embed-text">
            <div class="install-substack-app-header">Get more from Casey Author in the Substack app</div>
            <div class="install-substack-app-text">Available for iOS and Android</div>
          </div>
          <a href="https://substack.com/app/app-store-redirect?utm_campaign=app-marketing" target="_blank" class="install-substack-app-embed-link">
            <button class="install-substack-app-embed-btn button primary">Get the app</button>
          </a>
        </div>
        <p>After.</p>
      `
      const expected = html`
        <p>Before.</p>
        <img class="install-substack-app-embed-img" src="https://substackcdn.com/image/fetch/f_auto/icon.png">
        <p>Get more from Casey Author in the Substack app</p>
        <p>Available for iOS and Android</p>
        <p><a
          href="https://substack.com/app/app-store-redirect?utm_campaign=app-marketing"
          target="_blank"
          class="install-substack-app-embed-link"
        ><button class="install-substack-app-embed-btn button primary">Get the app</button></a></p>
        <p>After.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop the PaywallToDOM and SponsorshipCampaignToDOM markers', async () => {
      // stripEmptyTags owns them: the paywall jump target and the sponsor ad slot are both
      // empty divs, and removal is the desired end state.
      const sponsorAttrs = substackAttrs({
        id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
        campaignPostId: 'e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8b',
        pub: null,
      })
      const value = html`
        <p>Public part.</p>
        <div class="paywall-jump" data-component-name="PaywallToDOM"></div>
        <div
          class="sponsorship-campaign-embed"
          data-attrs="${sponsorAttrs}"
          data-component-name="SponsorshipCampaignToDOM"
        ></div>
        <p>Paid part.</p>
      `
      const expected = html`
        <p>Public part.</p>
        <p>Paid part.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop a PollToDOM embed', async () => {
      // Known loss: the poll ships only its id and votes live on Substack, so stripEmptyTags
      // deletes the empty div; no poll kind exists to park it in.
      const pollAttrs = substackAttrs({ id: 123456 })
      const value = html`
        <p>Before.</p>
        <div class="poll-embed" data-attrs="${pollAttrs}" data-component-name="PollToDOM"></div>
        <p>After.</p>
      `
      const expected = html`
        <p>Before.</p>
        <p>After.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop a CommentPlaceholder with its quoted comment', async () => {
      // Known loss: the quoted-comment payload is parked with the comment kind, so the
      // childless div is deleted, comment text and all.
      const commentAttrs = substackAttrs({
        url: 'https://open.substack.com/home',
        commentId: 12345678,
        comment: {
          id: 12345678,
          date: '2025-03-05T05:39:41.237Z',
          body: 'The quoted comment text.',
          name: 'Casey Commenter',
          user_id: 1,
        },
      })
      const value = html`
        <p>Before.</p>
        <div class="comment" data-attrs="${commentAttrs}" data-component-name="CommentPlaceholder"></div>
        <p>After.</p>
      `
      const expected = html`
        <p>Before.</p>
        <p>After.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop a CommunityPostPlaceholder with its quoted chat post', async () => {
      // Known loss: the quoted chat-post payload is parked with the comment kind, same as
      // CommentPlaceholder.
      const chatPostAttrs = substackAttrs({
        url: 'https://open.substack.com/chat/posts/2c932b4f-f0a8-4db2-8dae-7e381ede1563?utm_source=thread_embed',
        postId: '2c932b4f-f0a8-4db2-8dae-7e381ede1563',
        communityPost: {
          id: '2c932b4f-f0a8-4db2-8dae-7e381ede1563',
          publication_id: 1,
          body: 'The chat post text.',
        },
      })
      const value = html`
        <p>Before.</p>
        <div class="community-post" data-attrs="${chatPostAttrs}" data-component-name="CommunityPostPlaceholder"></div>
        <p>After.</p>
      `
      const expected = html`
        <p>Before.</p>
        <p>After.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop a LatexBlockToDOM expression', async () => {
      // Known loss: the expression lives only in the data-attrs JSON and the math kind is
      // parked, so stripEmptyTags deletes the childless div.
      const latexAttrs = substackAttrs({
        persistentExpression: '\\log_{10}(P)= -4.701 + 5.218\\log_{10}(t)',
        id: 'DZZQYUJUUA',
      })
      const value = html`
        <p>The OLS fit gives:</p>
        <div class="latex-rendered" data-attrs="${latexAttrs}" data-component-name="LatexBlockToDOM"></div>
        <p>with a high fit quality.</p>
      `
      const expected = html`
        <p>The OLS fit gives:</p>
        <p>with a high fit quality.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop a CashtagToDOM span and its ticker symbol', async () => {
      // Known loss: the ticker lives only in the data-attrs JSON, so the empty span is
      // deleted mid-sentence; no restore is minted for it.
      const cashtagAttrs = substackAttrs({ symbol: '$RKLB' })
      const value = html`
        <p>Rocket Lab <span
          class="cashtag-wrap"
          data-attrs="${cashtagAttrs}"
          data-component-name="CashtagToDOM"
        ></span> returned 105% from entry.</p>
      `
      const expected = html`<p>Rocket Lab  returned 105% from entry.</p>`
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop a RecipeToDOM embed', async () => {
      // Known loss: the recipe ships only its id and the card is rendered server-side, so
      // stripEmptyTags deletes the empty div.
      const recipeAttrs = substackAttrs({ id: 12345 })
      const value = html`
        <h3>Cake Goop</h3>
        <div
          class="recipe-embed"
          data-attrs="${recipeAttrs}"
          data-component-name="RecipeToDOM"
        ></div>
        <h3>Books</h3>
      `
      const expected = html`
        <h3>Cake Goop</h3>
        <h3>Books</h3>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it('should drop a PolymarketToDOM embed', async () => {
      // Known loss: the market embed ships childless with only slugs in its payload, so
      // stripEmptyTags deletes it.
      const polymarketAttrs = substackAttrs({
        eventSlug: 'example-event-06-29-2026',
        marketSlug: '',
        profileName: '',
        belowTheFold: true,
        fullEmbedUrl: 'https://substack.com/embed/polymarket/example-event-06-29-2026',
        isGraphMode: false,
      })
      const value = html`
        <p>Before.</p>
        <div class="polymarket-embed" data-attrs="${polymarketAttrs}" data-component-name="PolymarketToDOM"></div>
        <p>After.</p>
      `
      const expected = html`
        <p>Before.</p>
        <p>After.</p>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toEqualHtml(expected)
    })

    it.todo('should resolve a Twitter2ToDOM tweet once its resolver lands', () => {
      // The twitter resolver is in an open PR; add the disposition when it merges.
    })

    it.todo('should resolve an InstagramToDOM post once its resolver lands', () => {
      // The instagram resolver is in an open PR; add the disposition when it merges.
    })

    it.todo('should resolve a BlueskyCreateBlueskyEmbed post once its resolver lands', () => {
      // The bluesky resolver is in an open PR; add the disposition when it merges.
    })
  })

  // Disposition todos exist only for platforms whose handling spans several mechanisms,
  // where a suite is what shows how they divide the work. Platforms a single resolver owns
  // (Spotify, Vimeo, the podcast hosts) are pinned by that resolver's own tests, so they
  // get no entry here.
  describe.todo('Platform e2e: YouTube', () => {
    // The widest spread. youtubeIframeEmbedResolver and youtubeAmpEmbedResolver claim the
    // carriers and amp-youtube elements (youtubeHosts includes youtube.googleapis.com, the
    // Flash-era host Blogger feeds still ship). Each plugin facade has its own rebuild:
    // rebuildLazyYtEmbeds, rebuildLyteEmbeds, rebuildRocketYoutubePreviews,
    // rebuildLiteVideoEmbeds, rebuildEmbedPlusEmbeds, rebuildElementorVideoEmbeds and
    // rebuildLazyLoadForVideos. surfaceParkedMarkup recovers iframes parked percent-encoded
    // in data-content, extractVideoId strips the stray bbcode quote Steam news leaks into
    // embed srcs, and defaultNonContentSelectors drops the Steam poster gif shown before
    // its script swaps the real iframe in.
  })

  describe.todo('Platform e2e: Discourse', () => {
    // discourseCiteResolver turns generic onebox cards into cites, passing through the
    // engines in omittedOneboxClasses and the social posts recognized via socialPostHosts
    // and the Mastodon status signals. discourseMediaResolver rebuilds uploaded videos from
    // their placeholder divs, and the engines that emit bare iframes are left to the
    // host-keyed embed resolvers.
  })

  describe.todo('Platform e2e: WordPress', () => {
    // convertWidgets claims the embed carriers inside the oEmbed wrapper figures, with
    // getWrapperRatioDimensions reading their wp-embed-aspect-* classes when the carrier
    // states no size. fixLazyIframes and fixLazyImages recover the consent-gate and
    // lazy-loader attribute stashes (defaultLazyIframeAttributes, defaultLazySrcAttributes).
    // The plugin facades are rebuilt by rebuildLyteEmbeds, rebuildRocketYoutubePreviews,
    // rebuildLazyLoadForVideos, rebuildEmbedPlusEmbeds and rebuildElementorVideoEmbeds.
    // wp-embedded-content post embeds are in open PR #361; add that clause when it merges.
  })

  describe.todo('Platform e2e: Ghost', () => {
    // ghostMediaResolver rebuilds the kg-video-card and kg-audio-card players and
    // ghostCiteResolver converts kg-bookmark-card bookmarks. kg-file-card has no owner
    // while the file kind stays parked, and galleries are in open PR #129; add that clause
    // when it merges.
  })

  describe.todo('Platform e2e: Tumblr', () => {
    // tumblrCiteResolver owns both NPF link shapes: the bare .npf_link anchor with its
    // data-npf JSON and the .npf-link-block card painted as markup. Unwrapping the
    // t.umblr.com and href.li redirectors stays with the injected cleanUrlFn on purpose.
  })

  describe.todo('Platform e2e: Twitter', () => {
    // Multi-carrier resolvers are in open PR #520; the suite becomes writable when it merges.
  })

  describe.todo('Platform e2e: Instagram', () => {
    // Multi-carrier resolvers are in open PR #548; the suite becomes writable when it merges.
  })

  describe.todo('Platform e2e: Facebook', () => {
    // Multi-carrier resolvers are in open PR #483; the suite becomes writable when it merges.
  })

  describe.todo('Platform e2e: Bluesky', () => {
    // Multi-carrier resolvers are in open PR #547; the suite becomes writable when it merges.
  })

  describe.todo('Platform e2e: Mastodon', () => {
    // Multi-carrier resolvers are in open PR #546; the suite becomes writable when it merges.
  })

  describe.todo('Platform e2e: TikTok', () => {
    // The blockquote resolver is in open PR #471; the suite becomes writable when it merges.
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

  it('should collapse rules left touching by an emptied block between them', async () => {
    const value = '<hr><p>&nbsp;</p><hr>'
    // stripEmptyTags drops the spacer paragraph, and the two rules it was holding apart
    // then read as one run.
    const expected = '<hr>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should collapse a longer run of rules down to one', async () => {
    const value = '<p>First</p><hr><hr><hr><hr><p>Second</p>'
    const expected = '<p>First</p><hr><p>Second</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should collapse rules separated only by breaks', async () => {
    const value = '<p>First</p><hr><br><br><hr><p>Second</p>'
    // stripDuplicateRules ignores a <br> between two rules, but stripInterBlockBreaks has
    // already dropped it as redundant between blocks, so the run still collapses.
    const expected = '<p>First</p><hr><p>Second</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should collapse rules left touching by a stripped subscribe widget', async () => {
    const value = html`
      <p>Article text</p>
      <div><hr></div>
      <div class="subscription-widget-wrap-editor"><p>Subscribe now</p></div>
      <div><hr></div>
      <p>More text</p>
    `
    // The rules bracket the widget in the feed, so removing it as non-content is what
    // puts them side by side — unwrapWrappers dissolves their <div>s first.
    const expected = html`
      <p>Article text</p>
      <hr>
      <p>More text</p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
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
      <p>Watch <iframe src="https://www.youtube.com/embed/def456"></iframe> inline</p>
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

  // Transforms move elements through the DOM API, which enforces no nesting rules, so any
  // of them can leave a block inside a paragraph. A browser takes that apart into a split
  // paragraph, a hoisted block, bare text and a stray empty paragraph, so the pipeline
  // emits the split itself. The two tests below reach it through different transforms.
  it('should leave no embed placeholder inside a paragraph', async () => {
    const value = html`
      <p>Watch <iframe src="https://www.youtube.com/embed/abc123"></iframe> inline</p>
      <p>Wrapped <span><iframe src="https://www.youtube.com/embed/def456"></iframe></span> after</p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    expect(result).toContain('<p>Watch </p>')
    expect(result).toContain('<p>Wrapped </p>')
    expect(result).not.toMatch(blockInParagraphRegex)
  })

  // The <code> holds a real newline, so it is promoted to a block <pre> rather than left
  // inline. The html tag collapses whitespace, which would drop the promotion.
  it('should leave no promoted code block inside a paragraph', async () => {
    const value = '<p>Install <code>npm install feedsweep\nbun add feedsweep</code> and done</p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    expect(result).toContain('<p>Install </p>')
    expect(result).toContain('<pre>')
    expect(result).not.toMatch(blockInParagraphRegex)
  })
})
