import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, jsonAttrValue } from '../tests.js'

describeForEachParser('Instagram', (parseHtml) => {
  // instagramBlockquoteEmbedResolver claims the share dialog's quote in every era and wrapper,
  // instagramAmpEmbedResolver the AMP component, instagramSubstackEmbedResolver the childless div
  // Substack ships with the whole card in data-attrs, and instagramIframeEmbedResolver any
  // instagram.com or instagr.am url a carrier names, the post page included. All four mint the
  // same frame from the permalink. A post is an embed and never a cite, and its picture lives
  // behind Instagram's signed CDN, so no native image or video is minted from one either.

  // The loader never runs in a reader, so the quote arrives as its own chrome. The script goes
  // with it, and the "View this post on Instagram" line does not become the post's text.
  it('should convert the share dialog quote and drop its loader script', async () => {
    const value = html`
      <blockquote
        class="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed&amp;utm_campaign=loading"
        data-instgrm-version="14"
        style=" background:#FFF; border:0; max-width:540px;"
      >
        <div style="padding:16px;">
          <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed" target="_blank">
            <div style="height: 40px; width: 40px;"></div>
            <div>View this post on Instagram</div>
          </a>
          <p style="color:#c9c8cd;">
            <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed" target="_blank">A post shared by Some User (@someuser)</a>
          </p>
        </div>
      </blockquote>
      <script async src="//www.instagram.com/embed.js"></script>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/CaUsPbUquKV"
        data-embed-src="https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/"
        data-embed-url="https://www.instagram.com/p/CaUsPbUquKV/"
        data-embed-author="@someuser"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A sanitizer strips the class and keeps the data attributes, which leaves a bare blockquote
  // that the cite pass reads before the widget pass does. This pins that the quote reaches the
  // widget resolvers whole rather than being claimed as a quotation on the way.
  it('should convert the quote a sanitizer stripped the class from', async () => {
    const value = html`
      <blockquote
        data-instgrm-permalink="https://www.instagram.com/p/CpiRiksOLDF/?utm_source=ig_embed&amp;utm_campaign=loading"
        data-instgrm-version="14"
        style="background: #FFF; border: 0;"
      >
        <div style="padding: 16px">
          <a href="https://www.instagram.com/p/CpiRiksOLDF/" target="_blank">
            <div>View this post on Instagram</div>
          </a>
        </div>
      </blockquote>
      <script async src="//www.instagram.com/embed.js"></script>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/CpiRiksOLDF"
        data-embed-src="https://www.instagram.com/p/CpiRiksOLDF/embed/"
        data-embed-url="https://www.instagram.com/p/CpiRiksOLDF/"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The 2018 dialog wrote the caption, the account and the date into the quote. That text is all
  // a reader ever gets of the post, so the placeholder has to carry it out of markup that is
  // otherwise replaced whole.
  it('should carry the caption, the account and the date of a dated quote', async () => {
    const value = html`
      <blockquote
        class="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink="https://www.instagram.com/p/BgPrjlfHcoB/"
        data-instgrm-version="8"
      >
        <div style="padding:8px;">
          <div style="background:#F8F8F8;">
            <div style="height:44px;"></div>
          </div>
          <p style="margin:8px 0 0 0;">
            <a href="https://www.instagram.com/p/BgPrjlfHcoB/" target="_blank">Bring some friends, a special one, or them all.</a>
          </p>
          <p style="color:#c9c8cd;">A post shared by <a href="https://www.instagram.com/somebakery/" target="_blank">Some Bakery</a> (@somebakery) on <time datetime="2018-03-22T01:45:03+00:00">Mar 21, 2018 at 6:45pm PDT</time></p>
        </div>
      </blockquote>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/BgPrjlfHcoB"
        data-embed-src="https://www.instagram.com/p/BgPrjlfHcoB/embed/captioned/"
        data-embed-url="https://www.instagram.com/p/BgPrjlfHcoB/"
        data-embed-description="Bring some friends, a special one, or them all."
        data-embed-author="@somebakery"
        data-embed-date="2018-03-22T01:45:03+00:00"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The only size a quote ever comes with sits on the Tumblr figure, one level above it, so the
  // widget pass has to run while that wrapper is still in the document. The figure is dissolved
  // afterwards, once the size it carried has been read into the placeholder.
  it('should take the size off the Tumblr figure the quote sits in', async () => {
    const value = html`
      <figure
        class="tmblr-embed tmblr-full"
        data-provider="instagram"
        data-orig-width="540"
        data-orig-height="627"
        data-url="https%3A%2F%2Fwww.instagram.com%2Freel%2FDGPdABWz84n%2F"
      >
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/reel/DGPdABWz84n/"
          data-instgrm-version="14"
        ></blockquote>
      </figure>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="reel/DGPdABWz84n"
        data-embed-src="https://www.instagram.com/reel/DGPdABWz84n/embed/"
        data-embed-url="https://www.instagram.com/reel/DGPdABWz84n/"
        data-embed-width="540"
        data-embed-height="627"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The AMP component states the shortcode and nothing else: no url, no text and no picture, with
  // the AMP runtime as the thing that would have built the frame.
  it('should convert the amp component from its shortcode alone', async () => {
    const value = html`
      <amp-instagram
        data-shortcode="CaUsPbUquKV"
        data-captioned
        layout="responsive"
        width="320"
        height="392"
      ></amp-instagram>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/CaUsPbUquKV"
        data-embed-src="https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/"
        data-embed-url="https://www.instagram.com/p/CaUsPbUquKV/"
        data-embed-width="320"
        data-embed-height="392"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // Substack renders the post server-side and ships the div childless, so with nothing claiming it
  // stripEmptyTags deletes the div and the post goes with it. Substack rehosts the picture and the
  // profile photo to its own storage, and both copies reach the placeholder.
  it('should convert the childless Substack wrapper and keep its rehosted images', async () => {
    const postAttrs = jsonAttrValue({
      instagram_id: 'DZmgID9Eawg',
      title: 'Some Bakery on Instagram: "The caption, as the post page titles it."',
      author_name: '@somebakery',
      thumbnail_url:
        'https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-snapshot-DZmgID9Eawg.jpg',
      like_count: 6554,
      comment_count: 7697,
      profile_pic_url:
        'https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-profile-pic-DZmgID9Eawg.png',
      follower_count: null,
      timestamp: null,
      belowTheFold: true,
    })
    const value = html`
      <div
        class="instagram-embed-wrap"
        data-attrs="${postAttrs}"
        data-component-name="InstagramToDOM"
      ></div>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/DZmgID9Eawg"
        data-embed-src="https://www.instagram.com/p/DZmgID9Eawg/embed/"
        data-embed-url="https://www.instagram.com/p/DZmgID9Eawg/"
        data-embed-description="Some Bakery on Instagram: &quot;The caption, as the post page titles it.&quot;"
        data-embed-author="@somebakery"
        data-embed-avatar="https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-profile-pic-DZmgID9Eawg.png"
        data-embed-thumbnail="https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-snapshot-DZmgID9Eawg.jpg"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The earliest payloads passed Instagram's own CDN url through instead of rehosting it. It is
  // signed and expired years ago, so the placeholder states no thumbnail at all and keeps the
  // caption and the timestamp this era does carry.
  it('should convert an early Substack wrapper without its expired thumbnail', async () => {
    const earliestAttrs = jsonAttrValue({
      instagram_id: 'B-aCA0LhRiq',
      title: 'We can all use some flowers to make us smile.',
      author_name: 'somebakery',
      thumbnail_url:
        'https://scontent.cdninstagram.com/v/t51.2885-15/e35/s480x480/91252884_606008746674680_2338248453310937580_n.jpg?_nc_ht=scontent.cdninstagram.com&oh=fa18e95a423e5ad00f1c63d96aa7b516&oe=5FC16EAF',
      timestamp: '2020-03-31T17:40:31.000Z',
    })
    const value = html`
      <div
        class="instagram-embed-wrap"
        data-attrs="${earliestAttrs}"
        data-component-name="InstagramToDOM"
      ></div>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/B-aCA0LhRiq"
        data-embed-src="https://www.instagram.com/p/B-aCA0LhRiq/embed/"
        data-embed-url="https://www.instagram.com/p/B-aCA0LhRiq/"
        data-embed-description="We can all use some flowers to make us smile."
        data-embed-author="@somebakery"
        data-embed-date="2020-03-31T17:40:31.000Z"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A copy stored after the loader ran: its query names the page the frame was embedded in, which
  // the rebuilt src drops, while the height the loader measured is the one size this shape states.
  it('should rebuild a stored frame without the embedding page in its query', async () => {
    const value = html`
      <iframe
        class="instagram-media instagram-media-rendered"
        src="https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/?cr=1&amp;wp=540&amp;rd=https%3A%2F%2Fexample.com"
        height="640"
        frameborder="0"
        scrolling="no"
        data-instgrm-payload-id="instagram-media-payload-0"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/CaUsPbUquKV"
        data-embed-src="https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/"
        data-embed-url="https://www.instagram.com/p/CaUsPbUquKV/"
        data-embed-height="640"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A lazy loader parks the whole quote percent-encoded in data-content. surfaceParkedMarkup has
  // to decode it first: the container holds no text of its own, so stripEmptyTags would delete it
  // and no resolver would ever see a quote.
  it('should convert a quote parked in a lazy loader container', async () => {
    const value = html`
      <div
        class="load-later load-later-vendor-wwwinstagramcom"
        data-url="https://www.instagram.com/p/CaUsPbUquKV/?hl=en"
        data-content="%3Cblockquote%20class%3D%22instagram-media%22%20data-instgrm-captioned%20data-instgrm-permalink%3D%22https%3A%2F%2Fwww.instagram.com%2Fp%2FCaUsPbUquKV%2F%3Futm_source%3Dig_embed%22%20data-instgrm-version%3D%2214%22%3E%3Cp%3EView%20this%20post%20on%20Instagram%3C%2Fp%3E%3C%2Fblockquote%3E"
      ></div>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/CaUsPbUquKV"
        data-embed-src="https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/"
        data-embed-url="https://www.instagram.com/p/CaUsPbUquKV/"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // note.com names the post in an empty figure that only its own client hydrates, and
  // convertNoteEmbeds gives that url an iframe carrier. What the figure states is the post page,
  // which refuses framing, so the frame minted from it is what a reader can actually watch.
  it('should convert a note.com figure naming the post page', async () => {
    const value = html`
      <figure
        embedded-service="oembed"
        data-src="https://www.instagram.com/p/CaUsPbUquKV/"
        name="a1b2c3d4"
        id="a1b2c3d4"
      ></figure>
    `
    const expected = html`
      <div
        data-embed-provider="instagram"
        data-embed-id="p/CaUsPbUquKV"
        data-embed-src="https://www.instagram.com/p/CaUsPbUquKV/embed/"
        data-embed-url="https://www.instagram.com/p/CaUsPbUquKV/"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A profile is not a post, so nothing mints a frame for it and the generic iframe fallback keeps
  // the url the publisher wrote.
  it('should leave a profile frame to the generic fallback', async () => {
    const value = html`
      <iframe
        src="https://www.instagram.com/somebakery/embed/"
        height="640"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-height="640"
        data-embed-src="https://www.instagram.com/somebakery/embed/"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // A quote naming no post has nothing to mint a frame from, and it still holds the only text a
  // reader can get, so it stays as markup.
  it('should keep a quote that names no post as markup', async () => {
    const value = html`
      <blockquote class="instagram-media">
        <p>Some text and no link at all.</p>
      </blockquote>
    `
    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(value)
  })

  // The account may sit in front of the post, which is a web route rather than the bare
  // permalink. It names the poster, not the post, so it mints the same frame the bare path does.
  it('should convert a post addressed through its account', async () => {
    const value = '<iframe src="https://www.instagram.com/aseverofficial/p/CaUsPbUquKV/"></iframe>'
    const expected = html`
      <div
        data-embed-src="https://www.instagram.com/p/CaUsPbUquKV/embed/"
        data-embed-provider="instagram"
        data-embed-id="p/CaUsPbUquKV"
        data-embed-url="https://www.instagram.com/p/CaUsPbUquKV/"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // Instagram's own routes take the same shape as a handle. The share route names a redirect
  // token rather than a shortcode, so claiming it would frame a post that does not exist.
  it('should leave a share link to the generic placeholder', async () => {
    const value = '<iframe src="https://www.instagram.com/share/p/BAJ0RmC0Vq/"></iframe>'
    const expected = '<div data-embed-src="https://www.instagram.com/share/p/BAJ0RmC0Vq/"></div>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
