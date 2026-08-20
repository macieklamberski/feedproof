import { expect, it } from 'bun:test'
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

  it('should remove a 0x0 tracking pixel', async () => {
    // resolveMediaDimensions drops any width/height that is not a positive integer, so it used
    // to delete the zeros before removeTrackingPixels could read them. The pixel pass keys on
    // a declared 0 (see hasContentImageSignal), and 0x0 is the dominant beacon convention.
    // The host is not a known tracker, so only the size heuristic can catch this one.
    const value = html`
      <p>Text</p>
      <img width="0" height="0" src="https://cdn.example.com/spacer.gif">
    `
    const expected = '<p>Text</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should keep a 0x0 raster image, which is content rather than a beacon', async () => {
    const value = html`
      <p>Text</p>
      <img width="0" height="0" src="https://cdn.example.com/photo.jpg">
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContainHtml('<img')
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
    // the whole fragment as one text node. Otherwise only the lines holding a complete
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
    const expected = html`
      <p>Watch <span>
          <a href="https://youtu.be/HnLpU5vd5rI">https://youtu.be/HnLpU5vd5rI</a>
        </span>
      </p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should keep an anchored wbr url working and drop the break hint', async () => {
    const value = html`
      <p>
        <a href="https://youtu.be/HnLpU5vd5rI">https://youtu.be/<wbr></wbr>HnLpU5vd5rI</a>
      </p>
    `
    const expected = html`
      <p>
        <a href="https://youtu.be/HnLpU5vd5rI">https://youtu.be/HnLpU5vd5rI</a>
      </p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should inject audio/video enclosures as native media elements', async () => {
    const value = '<p>Content</p>'
    const expected = html`
      <audio
        src="https://example.com/audio.mp3"
        controls
        data-enclosure=""
      ></audio>
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

    expect(standard).toBe(value)
    expect(heuristic).toBe(value)
  })

  it('should strip a duplicate enclosure media only when heuristics are enabled', async () => {
    // The enclosure is the same audio already embedded in the content. Audio always
    // injects (no inline equivalent), so this is where stripDuplicateEnclosures earns
    // its keep, and only under heuristics.
    const value = '<p>Content</p><audio src="https://example.com/episode.mp3"></audio>'
    const enclosures = [{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }]
    const expectedStandard = html`
      <audio
        src="https://example.com/episode.mp3"
        controls
        data-enclosure=""
      ></audio>
      <p>Content</p>
      <audio src="https://example.com/episode.mp3"></audio>
    `

    const standard = await transformContent(value, { parseHtmlFn: parseHtml, enclosures })
    const heuristic = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enclosures,
      heuristics: true,
    })

    expect(standard).toEqualHtml(expectedStandard)
    expect(heuristic).toBe(value)
  })

  it('should remove paragraphs left empty after boundary br stripping', async () => {
    const value = html`
      <p>Hello</p>
      <p>
        <br>
      </p>
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
      <p>
        <br>
      </p>
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
        data-enclosure=""
      ></audio>
      <p>Content</p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
      assetProxyFn: (url, type) => `https://proxy.example.com/${type}/${encodeURIComponent(url)}`,
    })

    expect(result).toEqualHtml(expected)
  })

  // enrichEmbedPlaceholders is in the default pipeline and no-ops until enrichEmbedFn is set.
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
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enrichEmbedFn: (embeds) => {
        return embeds.map((embed) => ({
          title: `Title for ${embed.id}`,
          author: 'Test Channel',
          duration: 213,
        }))
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
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enrichEmbedFn: () => [],
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
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      enrichCiteFn: (cites) => {
        return cites.map((cite) => ({ ...cite, thumbnail: 'https://example.com/cover.png' }))
      },
    })

    expect(result).toEqualHtml(expected)
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
        return [{ title: 'Unused' }]
      },
    })
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
      ></div>
    `

    expect(called).toBe(false)
    expect(result).toEqualHtml(expected)
  })

  it('should dimension a lazy image from its resolved URL', async () => {
    const value = '<p><img data-src="https://example.com/photo-1024x768.jpg"></p>'
    const expected = html`
      <p>
        <img
          data-src="https://example.com/photo-1024x768.jpg"
          src="https://example.com/photo-1024x768.jpg"
          width="1024"
          height="768"
        >
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toEqualHtml(expected)
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
    // The superseded data-src is left in place.
    const expected = html`
      <p>
        <img
          data-src="https://example.com/a.jpg"
          src="https://example.com/a-800x600.webp"
          srcset="https://example.com/a-800x600.webp"
        >
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should dimension an image surfaced from a noscript fallback', async () => {
    const value = html`
      <p>
        <img src="https://example.com/placeholder.gif">
        <noscript>
          <img src="https://example.com/real-1024x768.jpg">
        </noscript>
      </p>
    `
    const expected = html`
      <p>
        <img
          src="https://example.com/real-1024x768.jpg"
          width="1024"
          height="768"
        >
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toEqualHtml(expected)
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
    const expected = html`
      <p>
        <img
          src="https://example.com/a.webp"
          width="277"
          height="530"
          srcset="https://example.com/a.webp 1000w"
        >
      </p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toEqualHtml(expected)
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
    const expected = '<p>Keep</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should strip non-content widget elements', async () => {
    const value = '<p>Article text</p><div class="adsbygoogle">Ad slot</div>'
    const expected = '<p>Article text</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
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
      <div>
        <hr>
      </div>
      <div class="subscription-widget-wrap-editor">
        <p>Subscribe now</p>
      </div>
      <div>
        <hr>
      </div>
      <p>More text</p>
    `
    // The rules bracket the widget in the feed, so removing it as non-content is what
    // puts them side by side. unwrapWrappers dissolves their <div>s first.
    const expected = html`
      <p>Article text</p>
      <hr>
      <p>More text</p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should strip comments outside pre blocks', async () => {
    const value = '<p>Text<!-- leaked build note --></p>'
    const expected = '<p>Text</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should replace an emoji image with its alt text', async () => {
    const value =
      '<p>Hello <img src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png" alt="\u{1F609}" class="wp-smiley"> world</p>'
    const expected = '<p>Hello \u{1F609} world</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should convert amp-img into a plain image', async () => {
    const value = html`
      <amp-img src="https://example.com/photo.jpg" alt="A photo" width="640" height="480"></amp-img>
    `
    const expected = html`
      <img
        src="https://example.com/photo.jpg"
        alt="A photo"
        width="640"
        height="480"
      >
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should canonicalize an alignment class into data-align', async () => {
    const value = '<img class="aligncenter" src="https://example.com/a.jpg">'
    const expected = '<img class="aligncenter" src="https://example.com/a.jpg" data-align="center">'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should promote style dimensions to width and height attributes', async () => {
    const value = '<img src="https://example.com/photo.jpg" style="width:300px;height:200px">'
    const expected = html`
      <img
        src="https://example.com/photo.jpg"
        style="width:300px;height:200px"
        width="300"
        height="200"
      >
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should linkify a bare url in text', async () => {
    const value = '<p>See https://example.com/page for details</p>'
    const expected = html`
      <p>See <a href="https://example.com/page">https://example.com/page</a> for details</p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should mark a line-leading timestamp', async () => {
    const value = '<p>01:21 - Intro</p>'
    const expected = '<p><span data-timestamp="81">01:21</span> - Intro</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  // A javascript: anchor is unwrapped by stripDeadAnchors before neutralizeUnsafeUrls
  // runs, so the pipeline outcome for links is removal, not the sentinel.
  it('should unwrap an unsafe link and keep its text', async () => {
    const value = '<p><a href="javascript:alert(1)">x</a></p>'
    const expected = '<p>x</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should neutralize an unsafe image src to the media sentinel', async () => {
    const value = '<p>Text</p><img src="javascript:alert(1)">'
    const expected = '<p>Text</p><img src="about:blank">'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should wrap a table in a scroll container', async () => {
    const value = '<table><tbody><tr><td>Cell</td></tr></tbody></table>'
    const expected = '<div data-table=""><table><tbody><tr><td>Cell</td></tr></tbody></table></div>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should demote a lone h1 to h2', async () => {
    const value = '<h1>Section</h1><p>Body</p>'
    const expected = '<h2>Section</h2><p>Body</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
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
      <h2>
        <a href="https://example.com/post#anchored">
          <strong>Anchored</strong>
        </a>
      </h2>
      <h3>
        <strong>Shared</strong>
        <span class="sharedaddy">Share this</span>
      </h3>
    `
    const expected = html`
      <h2>
        <a id="anchored" href="#anchored"></a>Anchored</h2>
      <h3>Shared</h3>
    `
    const result = await transformContent(value, options)

    expect(result).toEqualHtml(expected)
    expect(await transformContent(result, options)).toBe(result)
  })

  // Placeholders are the shape most likely to drift on a second pass: a cite one is built
  // before wrapBareInlineInParagraphs and an embed one after it, so each meets a different
  // set of transforms on a re-run.
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
    const expected = html`
      <p>Intro</p>
      <div data-embed-src="https://www.youtube.com/embed/abc123"></div>
      <p>Watch </p>
      <div data-embed-src="https://www.youtube.com/embed/def456"></div>
      <p> inline</p>
      <div
        data-cite-provider="ghost"
        data-cite-url="https://example.com/linked"
        data-cite-title="Linked post"
      ></div>
    `
    const once = await transformContent(value, options)
    const twice = await transformContent(once, options)

    expect(once).toEqualHtml(expected)
    expect(twice).toBe(once)
  })

  // Transforms move elements through the DOM API, which enforces no nesting rules, so any
  // of them can leave a block inside a paragraph. A browser takes that apart into a split
  // paragraph, a hoisted block, bare text and a stray empty paragraph, so the pipeline
  // emits the split itself. The two tests below reach it through different transforms.
  it('should leave no embed placeholder inside a paragraph', async () => {
    const value = html`
      <p>Watch <iframe src="https://www.youtube.com/embed/abc123"></iframe> inline</p>
      <p>Wrapped <span>
          <iframe src="https://www.youtube.com/embed/def456"></iframe>
        </span> after</p>
    `
    const expected = html`
      <p>Watch </p>
      <div data-embed-src="https://www.youtube.com/embed/abc123"></div>
      <p> inline</p>
      <p>Wrapped </p>
      <div data-embed-src="https://www.youtube.com/embed/def456"></div>
      <p> after</p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    expect(result).toBe(expected)
  })

  // The <code> holds a real newline, so it is promoted to a block <pre> rather than left
  // inline. The html tag collapses whitespace, which would drop the promotion.
  it('should leave no promoted code block inside a paragraph', async () => {
    const value = '<p>Install <code>npm install feedsweep\nbun add feedsweep</code> and done</p>'
    const expected =
      '<p>Install </p><pre><code>npm install feedsweep\nbun add feedsweep</code></pre><p> and done</p>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    expect(result).toBe(expected)
  })
})
