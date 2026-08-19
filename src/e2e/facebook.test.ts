import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'

describeForEachParser('Facebook', (parseHtml) => {
  // Five carriers reach the same plugins.php placeholder. facebookWidgetEmbedResolver claims the
  // SDK widget div, facebookXfbmlEmbedResolver the pre-SDK `<fb:post>` tag,
  // facebookAmpEmbedResolver the AMP element, facebookIframeEmbedResolver the plugin url itself
  // and facebookBlockquoteEmbedResolver the dialog's fallback blockquote when the publisher kept
  // only that. defaultEmojiImageHosts turns the emoji images a pasted post ships into their
  // characters. A comment thread is page chrome, so `.fb-comments` is in
  // defaultNonContentSelectors and the AMP and plugin-url forms of it are refused; the like
  // button and the page timeline are refused for the same reason and disappear as empty tags.

  // The shape a publisher actually pastes: the loader div, the SDK script and the widget div
  // holding the fallback. Only the placeholder survives, and the fallback is what carries the
  // post text, the page and the date into it. The blockquote resolver is registered after the
  // widget one so it does not claim the same subtree a second time.
  it('should collapse the SDK loader and the post widget into one placeholder', async () => {
    const value = html`
      <div id="fb-root"></div>
      <script
        async
        defer
        crossorigin="anonymous"
        src="https://connect.facebook.net/en_GB/sdk.js#xfbml=1&version=v3.2"
      ></script>
      <div
        class="fb-post"
        data-href="https://www.facebook.com/PageName/posts/123"
        data-width="500"
      >
        <div class="fb-xfbml-parse-ignore">
          <blockquote cite="https://www.facebook.com/PageName/posts/123">
            <p>Caption text about the thing.</p>
            Posted by <a href="https://www.facebook.com/PageName/">PageName</a> on
            <a href="https://www.facebook.com/PageName/posts/123">Tuesday, 3 June 2026</a>
          </blockquote>
        </div>
      </div>
    `
    const expected = html`
      <div
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/PageName/posts/123"
        data-embed-src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        data-embed-url="https://www.facebook.com/PageName/posts/123"
        data-embed-description="Caption text about the thing."
        data-embed-author="PageName"
        data-embed-date="Tuesday, 3 June 2026"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A video is the same carrier as the post above and differs only in the class naming which
  // plugin the script would have built, so it is covered once. What the pipeline adds is the
  // ordering: a widget div with no fallback is an empty div, and the widget pass has to claim it
  // before the empty-tag pass reaches it.
  it('should claim the empty video widget before it is dropped as an empty tag', async () => {
    const value = html`
      <div
        class="fb-video"
        data-href="https://www.facebook.com/PageName/videos/123/"
        data-width="500"
      ></div>
    `
    const expected = html`
      <div
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/PageName/videos/123/"
        data-embed-src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F"
        data-embed-url="https://www.facebook.com/PageName/videos/123/"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The XFBML tag is usually pasted into a body that is otherwise plain text, so it has to be
  // read as markup by the paragraphizer before any resolver sees an element: a prefixed tag name
  // that the pass does not recognize ends up inside the paragraph it was meant to interrupt.
  it('should resolve an xfbml tag that arrives in a bare text payload', async () => {
    const value =
      'Intro line.<fb:post href="https://www.facebook.com/PageName/posts/123"></fb:post>Closing line.'
    const expected = html`
      <p>Intro line.</p>
      <div
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/PageName/posts/123"
        data-embed-src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        data-embed-url="https://www.facebook.com/PageName/posts/123"
      ></div>
      <p>Closing line.</p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The AMP element is empty too, and an unknown custom element survives the passes that drop
  // empty tags, so the contract here is that the size AMP requires on the element reaches the
  // placeholder.
  it('should resolve an amp-facebook element and keep its declared size', async () => {
    const value = html`
      <amp-facebook
        width="552"
        height="303"
        layout="responsive"
        data-href="https://www.facebook.com/PageName/posts/123"
      ></amp-facebook>
    `
    const expected = html`
      <div
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/PageName/posts/123"
        data-embed-src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        data-embed-url="https://www.facebook.com/PageName/posts/123"
        data-embed-width="552"
        data-embed-height="303"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A comment thread is not the article's content, so the resolver refuses it. Nothing else
  // claims the element either, so it reaches the output as the custom element it arrived as.
  it('should leave an amp-facebook comment embed as markup', async () => {
    const value = html`
      <amp-facebook
        width="552"
        height="303"
        data-embed-as="comment"
        data-href="https://www.facebook.com/PageName/posts/123"
      ></amp-facebook>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(value)
  })

  // A lazy loader parks the plugin url in its own attribute and points the frame at a blank
  // page, so the resolver only ever sees a Facebook url because fixLazyIframes puts it back
  // first. The size the dialog wrote for a Reel is vertical and survives the round trip.
  it('should recover a plugin iframe parked in a lazy attribute', async () => {
    const value = html`
      <iframe
        src="about:blank"
        data-src="https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F123%2F&show_text=false&width=267"
        width="267"
        height="476"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/reel/123/"
        data-embed-src="https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F123%2F&show_text=false&width=267"
        data-embed-url="https://www.facebook.com/reel/123/"
        data-embed-width="267"
        data-embed-height="476"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The publisher kept the dialog's fallback and dropped the widget div around it. The byline is
  // a run of bare text nodes and anchors, which the paragraphizer would otherwise split into
  // paragraphs, so the resolver has to claim the blockquote whole.
  it('should convert a standalone fallback blockquote into a placeholder', async () => {
    const value = html`
      <blockquote
        class="fb-xfbml-parse-ignore"
        cite="https://www.facebook.com/PageName/videos/123/"
      >
        <p>A video caption.</p>
        Posted by <a href="https://www.facebook.com/PageName/">PageName</a> on
        <a href="https://www.facebook.com/PageName/videos/123/">Wednesday, 4 June 2026</a>
      </blockquote>
    `
    const expected = html`
      <div
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/PageName/videos/123/"
        data-embed-src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F"
        data-embed-url="https://www.facebook.com/PageName/videos/123/"
        data-embed-description="A video caption."
        data-embed-author="PageName"
        data-embed-date="Wednesday, 4 June 2026"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should strip a fb-comments thread as non-content', async () => {
    const value = html`
      <p>Article text.</p>
      <div
        class="fb-comments"
        data-href="https://example.com/post"
        data-numposts="5"
        data-width="100%"
      ></div>
    `
    const expected = '<p>Article text.</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The resolver takes the post and video plugins only, so a comments-plugin url falls to the
  // generic iframe fallback. That is not the same treatment as the div form stripped above, and
  // the difference is the point: the div is an empty JS mount with nothing to show, while this
  // endpoint still answers 200, so a click-to-load card is something a reader can open.
  it('should fall back the comments plugin iframe to a generic placeholder', async () => {
    const value = html`
      <iframe
        src="https://www.facebook.com/plugins/comments.php?href=https%3A%2F%2Fexample.com%2Fpost&numposts=5"
        width="500"
        height="400"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-src="https://www.facebook.com/plugins/comments.php?href=https%3A%2F%2Fexample.com%2Fpost&numposts=5"
        data-embed-width="500"
        data-embed-height="400"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A pasted post carries its emoji as images off Facebook's own CDN, which render as broken
  // pictures once the SDK is gone.
  it('should replace a Facebook emoji image with its character', async () => {
    const value = html`
      <p>Great news
        <img
          class="_1ift"
          src="https://static.xx.fbcdn.net/images/emoji.php/v9/t4/1/16/1f600.png"
          alt="😀"
        >
        for everyone.</p>
    `
    const expected = '<p>Great news 😀 for everyone.</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
