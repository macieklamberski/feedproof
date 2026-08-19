import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, jsonAttrValue } from '../tests.js'

describeForEachParser('Twitter', (parseHtml) => {
  // twitterBlockquoteEmbedResolver claims the blockquote the embed dialog writes, including the
  // twitter-video spelling of it, twitterAmpEmbedResolver the amp-twitter component,
  // twitterSubstackEmbedResolver the div Substack's editor stores a pasted tweet in, and
  // twitterIframeEmbedResolver the player frame and the status page a wrapper frames instead of
  // it. The host eras (twitter.com, x.com, mobile.twitter.com) and the proxy front-ends are read
  // off the anchor inside the resolver, and no pass before it touches them, so they stay pinned
  // on the resolver. A twitter-video blockquote reaches the same placeholder as the canonical
  // one through the same passes, so one case covers both.

  // The byline is a bare text node between the tweet paragraph and the dated anchor, so the
  // resolver cannot read the author until wrapBareInlineInParagraphs has made it a paragraph.
  // The loader that turns the quote into a player is childless, so stripEmptyTags takes it.
  it('should convert the canonical blockquote and leave no loader behind', async () => {
    const value = html`
      <blockquote
        class="twitter-tweet"
        data-dnt="true"
      >
        <p lang="en" dir="ltr">Tweet text here.</p>
        &mdash; Display Name (@user)
        <a href="https://twitter.com/user/status/123456789012345?ref_src=twsrc%5Etfw">
          May 12, 2020
        </a>
      </blockquote>
      <script
        async
        src="https://platform.twitter.com/widgets.js"
        charset="utf-8"
      ></script>
    `
    const expected = html`
      <div
        data-embed-provider="twitter"
        data-embed-id="123456789012345"
        data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
        data-embed-url="https://x.com/user/status/123456789012345"
        data-embed-description="Tweet text here."
        data-embed-author="Display Name"
        data-embed-date="May 12, 2020"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The Gutenberg wrapper, which the Jetpack, Ghost, RebelMouse and per-theme wrappers repeat
  // with another class. unwrapWrappers dissolves the inner div and keeps the figure, since a
  // figure holding a placeholder is content markup rather than a generated shell.
  it('should keep the wp-block figure around the placeholder it wraps', async () => {
    const value = html`
      <figure class="wp-block-embed is-type-rich is-provider-twitter wp-block-embed-twitter">
        <div class="wp-block-embed__wrapper">
          <blockquote
            class="twitter-tweet"
            data-width="550"
            data-dnt="true"
          >
            <p lang="en" dir="ltr">Tweet text here.</p>
            &mdash; Display Name (@user)
            <a href="https://twitter.com/user/status/123456789012345?ref_src=twsrc%5Etfw">
              May 12, 2020
            </a>
          </blockquote>
          <script
            async
            src="https://platform.twitter.com/widgets.js"
          ></script>
        </div>
      </figure>
    `
    const expected = html`
      <figure class="wp-block-embed is-type-rich is-provider-twitter wp-block-embed-twitter">
        <div
          data-embed-provider="twitter"
          data-embed-id="123456789012345"
          data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
          data-embed-url="https://x.com/user/status/123456789012345"
          data-embed-description="Tweet text here."
          data-embed-author="Display Name"
          data-embed-date="May 12, 2020"
        ></div>
      </figure>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // An Atom payload arrives as text, so nothing is an element until the entities are decoded.
  it('should convert an entity-encoded blockquote once it is decoded', async () => {
    const value =
      '&lt;blockquote class=&quot;twitter-tweet&quot;&gt;&lt;p lang=&quot;en&quot; dir=&quot;ltr&quot;&gt;Tweet text here.&lt;/p&gt;&amp;mdash; Display Name (@user) &lt;a href=&quot;https://twitter.com/user/status/123456789012345&quot;&gt;May 12, 2020&lt;/a&gt;&lt;/blockquote&gt;'
    const expected = html`
      <div
        data-embed-provider="twitter"
        data-embed-id="123456789012345"
        data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
        data-embed-url="https://x.com/user/status/123456789012345"
        data-embed-description="Tweet text here."
        data-embed-author="Display Name"
        data-embed-date="May 12, 2020"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The component carries no text at all, so the id and the size it states are everything
  // there is to take, and unclaimed it reaches a reader as an element nothing renders.
  it('should convert an amp-twitter component that carries no text', async () => {
    const value = html`
      <amp-twitter
        width="375"
        height="472"
        layout="responsive"
        data-tweetid="123456789012345"
      ></amp-twitter>
    `
    const expected = html`
      <div
        data-embed-provider="twitter"
        data-embed-id="123456789012345"
        data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
        data-embed-width="375"
        data-embed-height="472"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // Substack renders this div client-side, so it arrives childless and stripEmptyTags takes
  // whatever the resolver does not claim first. The tweet text is markup inside the JSON and
  // reaches the placeholder as plain text, its links flattened.
  it('should convert a Substack Twitter2ToDOM div from its payload alone', async () => {
    const tweetAttrs = jsonAttrValue({
      url: 'https://twitter.com/user/status/123456789012345',
      full_text:
        'Tweet text here. <a class="tweet-url" href="https://example.com/notes">example.com/notes</a>',
      username: 'user',
      name: 'Display Name',
      profile_image_url: 'https://pbs.substack.com/media/profile.jpg',
      date: 'Thu Feb 08 12:00:45 +0000 2018',
      photos: [{ img_url: 'https://pbs.substack.com/media/DVgu7f1WsAAkNMr.jpg' }],
      like_count: 968,
    })
    const value = html`
      <div
        class="twitter-embed"
        data-attrs="${tweetAttrs}"
        data-component-name="Twitter2ToDOM"
      ></div>
    `
    const expected = html`
      <div
        data-embed-provider="twitter"
        data-embed-id="123456789012345"
        data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
        data-embed-url="https://x.com/user/status/123456789012345"
        data-embed-description="Tweet text here. example.com/notes"
        data-embed-author="Display Name"
        data-embed-avatar="https://pbs.substack.com/media/profile.jpg"
        data-embed-date="Thu Feb 08 12:00:45 +0000 2018"
        data-embed-thumbnail="https://pbs.substack.com/media/DVgu7f1WsAAkNMr.jpg"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // note.com ships an empty figure naming the status page, which its own client hydrates and a
  // reader cannot. convertNoteEmbeds gives the url an iframe carrier, and the resolver mints the
  // player from a page that refuses framing.
  it('should convert a note.com figure naming the status page', async () => {
    const value = html`
      <figure
        name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
        data-src="https://x.com/user/status/123456789012345"
        data-identifier="n1234"
        embedded-service="twitter"
        embedded-content-key="emb123"
      ></figure>
    `
    const expected = html`
      <div
        data-embed-provider="twitter"
        data-embed-id="123456789012345"
        data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
        data-embed-url="https://x.com/user/status/123456789012345"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The whole embed is parked percent-encoded in an attribute, so surfaceParkedMarkup has to
  // put the blockquote back in the document before anything can read it.
  it('should convert a tweet parked percent-encoded in data-content', async () => {
    const value = html`
      <div
        class="load-later load-later-vendor-twittercom"
        data-url="https://twitter.com/user/status/123456789012345"
        data-content="%3Cblockquote%20class%3D%22twitter-tweet%22%20data-width%3D%22500%22%3E%3Cp%20lang%3D%22en%22%20dir%3D%22ltr%22%3ETweet%20text%20here.%3C%2Fp%3E%26mdash%3B%20Display%20Name%20(%40user)%20%3Ca%20href%3D%22https%3A%2F%2Fx.com%2Fuser%2Fstatus%2F123456789012345%3Fref_src%3Dtwsrc%255Etfw%22%3EMay%2012%2C%202020%3C%2Fa%3E%3C%2Fblockquote%3E%3Cscript%20async%20src%3D%22https%3A%2F%2Fplatform.x.com%2Fwidgets.js%22%20charset%3D%22utf-8%22%3E%3C%2Fscript%3E"
      ></div>
    `
    const expected = html`
      <div
        data-embed-provider="twitter"
        data-embed-id="123456789012345"
        data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
        data-embed-url="https://x.com/user/status/123456789012345"
        data-embed-description="Tweet text here."
        data-embed-author="Display Name"
        data-embed-date="May 12, 2020"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A copy stored after the script ran holds both carriers at once: the div the blockquote
  // resolver claims and the player frame the iframe resolver claims. The outer element is
  // replaced whole, so one tweet stays one placeholder.
  it('should convert a post-rendered div holding its player into one placeholder', async () => {
    const value = html`
      <div
        class="twitter-tweet twitter-tweet-rendered"
        data-tweet-id="123456789012345"
      >
        <iframe src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"></iframe>
      </div>
    `
    const expected = html`
      <div
        data-embed-provider="twitter"
        data-embed-id="123456789012345"
        data-embed-src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A profile timeline is not a post, so nothing claims it and the link a reader can follow
  // stays, wrapped into a paragraph. The loader beside it goes as an empty tag.
  it('should keep a timeline widget as a link and drop its loader', async () => {
    const value = html`
      <a
        class="twitter-timeline"
        href="https://twitter.com/user"
      >Tweets by user</a>
      <script
        async
        src="https://platform.twitter.com/widgets.js"
      ></script>
    `
    const expected = html`
      <p>
        <a class="twitter-timeline" href="https://twitter.com/user">Tweets by user</a>
      </p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A read-more teaser borrows the class and names no tweet. Claiming it would swap a working
  // link for a placeholder pointing at nothing, so the link is what survives.
  it('should keep the link inside a read-more div that borrows the class', async () => {
    const value = html`
      <div class="twitter-tweet">
        <a href="https://example.com/news/story.html">Read more</a>
      </div>
    `
    const expected = html`
      <p>
        <a href="https://example.com/news/story.html">Read more</a>
      </p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
