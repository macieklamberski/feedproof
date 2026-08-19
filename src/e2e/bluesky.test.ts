import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, jsonAttrValue } from '../tests.js'

describeForEachParser('Bluesky', (parseHtml) => {
  // Four resolvers split the carriers. blueskyBlockquoteEmbedResolver claims the oEmbed
  // blockquote by its class or its declared AT URI, whichever wrapper it arrives in, and reads
  // the post text, author and date out of it. blueskyIframeEmbedResolver claims the player
  // iframe and the newsletter wrapper whose data-attrs holds the whole post.
  // blueskyS9eEmbedResolver claims the forum helper page, and blueskyPostElementEmbedResolver
  // the <bluesky-post> custom element. A Discourse onebox citing bsky.app is a cite rather
  // than an embed, so it belongs to discourseCiteResolver and to the Discourse suite.

  // Three provider slugs are in use on the figure (`bluesky-social`, `bluesky-embed` and a bare
  // `bluesky`) and all three reach the same placeholder, since only the blockquote is read.
  // The inner wrapper dissolves, the figure stays, and the loader script goes with every other
  // remote script.
  it('should convert the blockquote inside a Gutenberg figure and drop its loader script', async () => {
    const value = html`
      <figure class="wp-block-embed is-type-rich is-provider-bluesky-social wp-block-embed-bluesky-social">
        <div class="wp-block-embed__wrapper">
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3lbwtqmxbec2p"
            data-bluesky-cid="bafyreib2rxkhbjfrjlmpwjrfxkxvvnzybvhr3sedcqbovqhkr6qk4hzffe"
          >
            <p lang="en">The block editor pastes the oEmbed html verbatim.</p>
            &mdash;
            <a href="https://bsky.app/profile/did:plc:ewvi7nxzyoun6zhxrhs64oiz?ref_src=embed">Display Name (@user.bsky.social)</a>
            <a href="https://bsky.app/profile/did:plc:ewvi7nxzyoun6zhxrhs64oiz/post/3lbwtqmxbec2p?ref_src=embed">2025-01-02T03:04:05.006Z</a>
          </blockquote>
          <script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>
        </div>
      </figure>
    `
    const expected = html`
      <figure class="wp-block-embed is-type-rich is-provider-bluesky-social wp-block-embed-bluesky-social">
        <div
          data-embed-provider="bluesky"
          data-embed-id="did:plc:ewvi7nxzyoun6zhxrhs64oiz/3lbwtqmxbec2p"
          data-embed-src="https://embed.bsky.app/embed/did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3lbwtqmxbec2p"
          data-embed-url="https://bsky.app/profile/did:plc:ewvi7nxzyoun6zhxrhs64oiz/post/3lbwtqmxbec2p"
          data-embed-description="The block editor pastes the oEmbed html verbatim."
          data-embed-author="Display Name (@user.bsky.social)"
          data-embed-date="2025-01-02T03:04:05.006Z"
        ></div>
      </figure>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // Feed exporters ship the blockquote inside a paragraph, which no browser accepts. The
  // resolver never sees that: the placeholder is hoisted out and the paragraph it emptied goes.
  it('should hoist a paragraph-nested blockquote out of its invalid paragraph', async () => {
    const value = html`
      <p class="wp-block-paragraph">
        <blockquote
          class="bluesky-embed"
          data-bluesky-uri="at://did:plc:6hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lvq7aeuwbg42"
        >
          <p lang="en">Invalid nesting, still a post.</p>
        </blockquote>
      </p>
    `
    const expected = html`
      <div
        data-embed-provider="bluesky"
        data-embed-id="did:plc:6hz4agnyzcrsvpnprxrbjrpa/3lvq7aeuwbg42"
        data-embed-src="https://embed.bsky.app/embed/did:plc:6hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lvq7aeuwbg42"
        data-embed-url="https://bsky.app/profile/did:plc:6hz4agnyzcrsvpnprxrbjrpa/post/3lvq7aeuwbg42"
        data-embed-description="Invalid nesting, still a post."
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The post lives on the wrapper and the player on the iframe inside it. The resolver reads
  // the one from the other, and the wrapper is gone by the time the placeholder is written, so
  // this is the case that proves the payload outlives the element carrying it.
  it('should convert a player iframe and keep the post its wrapper carries', async () => {
    const postAttrs = jsonAttrValue({
      postId: '3mbq7aeuwbg42',
      authorDid: 'did:plc:bhz4agnyzcrsvpnprxrbjrpa',
      authorName: 'Newsletter Author',
      authorHandle: 'author.example',
      authorAvatarUrl:
        'https://cdn.bsky.app/img/avatar/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreiavatar@jpeg',
      text: 'The wrapper carries the post twice over.',
      createdAt: '2025-12-13T14:15:16.017Z',
      uri: 'at://did:plc:bhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mbq7aeuwbg42',
      imageUrls: [
        'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreithumb@jpeg',
      ],
    })
    const value = html`
      <div
        class="bluesky-wrap outer"
        style="height: auto; display: flex; margin-bottom: 24px;"
        data-attrs="${postAttrs}"
        data-component-name="BlueskyCreateBlueskyEmbed"
      >
        <iframe
          id="bluesky-3mbq7aeuwbg42"
          data-bluesky-id="1234567890123456"
          src="https://embed.bsky.app/embed/did:plc:bhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mbq7aeuwbg42?id=1234567890123456"
          width="100%"
          frameborder="0"
          scrolling="no"
        ></iframe>
      </div>
    `
    const expected = html`
      <div
        data-embed-provider="bluesky"
        data-embed-id="did:plc:bhz4agnyzcrsvpnprxrbjrpa/3mbq7aeuwbg42"
        data-embed-src="https://embed.bsky.app/embed/did:plc:bhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mbq7aeuwbg42"
        data-embed-url="https://bsky.app/profile/did:plc:bhz4agnyzcrsvpnprxrbjrpa/post/3mbq7aeuwbg42"
        data-embed-description="The wrapper carries the post twice over."
        data-embed-author="Newsletter Author (@author.example)"
        data-embed-avatar="https://cdn.bsky.app/img/avatar/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreiavatar@jpeg"
        data-embed-thumbnail="https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreithumb@jpeg"
        data-embed-date="2025-12-13T14:15:16.017Z"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The helper page is hosted by the forum's markup library, not by Bluesky, and states the box
  // it renders into as an inline style. That size survives to the placeholder, which makes this
  // the one carrier giving the reader a shape to reserve.
  it('should convert a forum helper iframe and keep the box it states', async () => {
    const value = html`
      <iframe
        data-s9e-mediaembed="bluesky"
        allowfullscreen=""
        scrolling="no"
        src="https://s9e.github.io/iframe/2/bluesky.min.html#at://did:plc:hhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mhq7aeuwbg42#embed.bsky.app"
        style="height:600px;width:600px"
        data-s9e-mediaembed-api="2"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-provider="bluesky"
        data-embed-id="did:plc:hhz4agnyzcrsvpnprxrbjrpa/3mhq7aeuwbg42"
        data-embed-src="https://embed.bsky.app/embed/did:plc:hhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mhq7aeuwbg42"
        data-embed-url="https://bsky.app/profile/did:plc:hhz4agnyzcrsvpnprxrbjrpa/post/3mhq7aeuwbg42"
        data-embed-width="600"
        data-embed-height="600"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The custom element names the post by handle rather than by did, and hides its styling in a
  // declarative shadow root no reader mounts. The template goes with the element, and the
  // fallback quote inside it is what fills the placeholder.
  it('should convert a post custom element and drop its shadow root template', async () => {
    const value = html`
      <bluesky-post
        allow-unauthenticated="true"
        contextless="true"
        silent="true"
        src="at://newsroom.example/app.bsky.feed.post/3miq7aeuwbg42"
      >
        <template shadowrootmode="open">
          <link href="https://cdn.jsdelivr.net/npm/bluesky-post-embed/dist/core.min.css" rel="stylesheet">
          <slot></slot>
        </template>
        <blockquote>
          <p dir="auto">The web component never mounts in a reader.</p>
          <p>
            — Newsroom (@newsroom.example)
            <a href="https://bsky.app/profile/newsroom.example/post/3miq7aeuwbg42">2026-02-15T16:17:18.019Z</a>
          </p>
        </blockquote>
      </bluesky-post>
    `
    const expected = html`
      <div
        data-embed-provider="bluesky"
        data-embed-id="newsroom.example/3miq7aeuwbg42"
        data-embed-src="https://embed.bsky.app/embed/newsroom.example/app.bsky.feed.post/3miq7aeuwbg42"
        data-embed-url="https://bsky.app/profile/newsroom.example/post/3miq7aeuwbg42"
        data-embed-description="The web component never mounts in a reader."
        data-embed-author="Newsroom (@newsroom.example)"
        data-embed-date="2026-02-15T16:17:18.019Z"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // Some feeds strip the AT URI and the footer both, leaving nothing that names a post. The
  // quote still holds the post's words, so it stays as it arrived instead of becoming a
  // placeholder pointing nowhere.
  it('should leave a blockquote naming no post as markup', async () => {
    const value = html`
      <blockquote class="bluesky-embed">
        <p lang="en">The identifier is gone entirely.</p>
      </blockquote>
    `
    const expected = value

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The player path spelled on somebody else's host names no Bluesky post, so the generic
  // iframe fallback takes it and the placeholder claims no provider.
  it('should fall back a lookalike player host to a generic placeholder', async () => {
    const value = html`
      <p>Before.</p>
      <iframe src="https://evil.test/embed.bsky.app/embed/did:plc:ghz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mgq7aeuwbg42"></iframe>
    `
    const expected = html`
      <p>Before.</p>
      <div data-embed-src="https://evil.test/embed.bsky.app/embed/did:plc:ghz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mgq7aeuwbg42"></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
