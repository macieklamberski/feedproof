import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, jsonAttrValue } from '../tests.js'

describeForEachParser('Substack', (parseHtml) => {
  // substackOwnPostCiteResolver and substackCrossPostCiteResolver claim the post embeds,
  // substackMediaResolver rebuilds the video and audio uploads from their id-only divs,
  // fixSubstackMentions, fixSubstackImageLinks and fixSubstackGalleries repair the three
  // components that ship broken, and defaultNonContentSelectors drops the subscribe and
  // publication promos. Everything else (captioned images, hydrated galleries, buttons,
  // footnotes, code, the third-party wraps) reaches its
  // shape through the generic passes: unwrapWrappers, flattenPictureElements,
  // stripNonContentElements and convertWidgets. The Twitter, Instagram and Bluesky wraps are
  // in open PRs #520, #548 and #547; their cases stay todo until those merge.

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
      ></div>
    `

    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toEqualHtml(expected)
  })

  // The same subscribe form as the wrap above, arriving as Substack's other snippet. Both are
  // chrome, so both go.
  it('should strip the subscribe iframe as non-content too', async () => {
    const value = html`
      <p>Text</p>
      <iframe src="https://other.substack.com/embed" width="480" height="320"></iframe>
    `
    const expected = '<p>Text</p>'

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  // The card follows a sentence introducing it often enough that stripping it left the sentence
  // pointing at nothing, so it converts instead of going the way of the subscribe widgets below.
  it('should convert a substack publication embed into a cite placeholder', async () => {
    const publicationAttrs = jsonAttrValue({
      name: 'Other Pub',
      base_url: 'https://otherpub.example.com',
      hero_text: 'A great read',
      author_name: 'Author name',
      logo_url: 'https://cdn.example.com/logo.png',
    })
    const value = html`
      <p>Check out the other newsletter here:</p>
      <div class="embedded-publication-wrap" data-attrs="${publicationAttrs}"></div>
    `
    const expected = html`
      <p>Check out the other newsletter here:</p>
      <div
        data-cite-provider="substack"
        data-cite-url="https://otherpub.example.com"
        data-cite-title="Other Pub"
        data-cite-description="A great read"
        data-cite-author="Author name"
        data-cite-icon="https://cdn.example.com/logo.png"
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/',
    })

    expect(result).toEqualHtml(expected)
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
                <picture>
                  <img src="https://cdn.example.com/img.png" width="600" height="400" alt="" />
                </picture>
                <div class="image-link-expand">
                  <button class="restack-image">restack</button>
                </div>
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

  // Where each Substack component ends up under the default pipeline. Most are owned by a
  // generic pass rather than a Substack-specific one, so without these cases a delegation
  // would read as a coverage gap. Fixtures are real feed markup, anonymized. Census rows
  // that are not Substack components (other CMSes reuse data-component-name) and Substack's
  // own error and fragment internals (AssetErrorToDOM, FragmentNodeToDOM) are excluded.

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
    const videoAttrs = jsonAttrValue({
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
    const audioAttrs = jsonAttrValue({
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
    // The host-keyed youtube resolver claims the inner iframe. The wrap divs dissolve.
    const youtubeAttrs = jsonAttrValue({
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
        data-embed-ratio="16/9"
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should resolve a spotify-wrap iframe into a spotify embed placeholder', async () => {
    // The url-keyed spotify resolver claims the iframe and reads the card Substack hangs on it;
    // the declared height wins. The description holds the type label, which the id already says.
    const episodeAttrs = jsonAttrValue({
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
        data-embed-title="Episode 42: Field Recording"
        data-embed-author="Casey Host"
        data-embed-thumbnail="https://i.scdn.co/image/ab6765630000ba8a0000000000000000000000ff"
        data-embed-height="232"
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should rebuild a MentionToDOM span into an inline profile link', async () => {
    // fixSubstackMentions owns it: the name lives only in the data-attrs JSON.
    const mentionAttrs = jsonAttrValue({
      name: 'Jane Miller',
      id: 123456,
      type: 'user',
      url: null,
    })
    const mention = `<span class="mention-wrap" data-attrs="${mentionAttrs}" data-component-name="MentionToDOM"></span>`
    const value = `<p>Thanks to ${mention} for the idea.</p>`
    const expected = html`
      <p>Thanks to <a href="https://substack.com/profile/123456">@Jane Miller</a> for the idea.</p>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should convert an EmbeddedPostToDOM cross-post card into a cite placeholder', async () => {
    // substackCrossPostCiteResolver owns it in the cite pass.
    const crossPostAttrs = jsonAttrValue({
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
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should convert a DigestPostEmbed own-post card into a cite placeholder', async () => {
    // substackOwnPostCiteResolver owns it in the cite pass.
    const ownPostAttrs = jsonAttrValue({
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
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should strip a SubscribeWidgetToDOM widget as non-content', async () => {
    // nonContentSelectors owns it (.subscription-widget-wrap-editor): a subscribe CTA is
    // chrome, so removal is the desired end state.
    const subscribeAttrs = jsonAttrValue({
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
    const expected = '<p>Thank you for being here.</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should drop DirectMessageToDOM and CommunityChatRenderPlaceholder divs', async () => {
    // stripEmptyTags owns them: both ship childless, hold no content to recover, and
    // point at interactions that only work on Substack, so removal is the desired end state.
    const directMessageAttrs = jsonAttrValue({
      userId: 123456,
      userName: 'Sam Fields',
      canDm: null,
      dmUpgradeOptions: null,
      isEditorNode: true,
    })
    const communityChatAttrs = jsonAttrValue({
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
    const expected = '<p>Come say hi.</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should strip a standalone ButtonCreateButton subscribe CTA', async () => {
    // nonContentSelectors owns it: the subscribe button is chrome outside a captioned wrap too.
    const buttonAttrs = jsonAttrValue({
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
    const expected = '<p>Please feel free to share this.</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should strip a standalone ButtonCreateButton comment CTA', async () => {
    const buttonAttrs = jsonAttrValue({
      url: 'https://examplepub.substack.com/p/the-post/comments',
      text: 'Leave a comment',
      action: null,
      class: null,
    })
    const value = html`
      <p>Before.</p>
      <p
        class="button-wrapper"
        data-attrs="${buttonAttrs}"
        data-component-name="ButtonCreateButton"
      ><a class="button primary" href="https://examplepub.substack.com/p/the-post/comments"><span>Leave a comment</span></a></p>
    `
    const expected = '<p>Before.</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should strip a standalone ButtonCreateButton share CTA', async () => {
    const buttonAttrs = jsonAttrValue({
      url: 'https://examplepub.substack.com/p/the-post?action=share',
      text: 'Share',
      action: null,
      class: null,
    })
    const value = html`
      <p>Before.</p>
      <p
        class="button-wrapper"
        data-attrs="${buttonAttrs}"
        data-component-name="ButtonCreateButton"
      ><a class="button primary" href="https://examplepub.substack.com/p/the-post?action=share"><span>Share</span></a></p>
    `
    const expected = '<p>Before.</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should keep a ButtonCreateButton the author pointed somewhere of their own', async () => {
    // Passes through: the component wraps author-authored buttons too, so only the platform
    // actions are claimed and a donate button keeps its link.
    const buttonAttrs = jsonAttrValue({
      url: 'https://example.com/donate?campaign=spring',
      text: 'One-time and recurring donations',
      action: null,
      class: 'button-wrapper',
    })
    const value = html`
      <p>Before.</p>
      <p
        class="button-wrapper"
        data-attrs="${buttonAttrs}"
        data-component-name="ButtonCreateButton"
      ><a class="button primary button-wrapper" href="https://example.com/donate?campaign=spring"><span>One-time and recurring donations</span></a></p>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(value)
  })

  it('should strip a CaptionedButtonToDOM CTA with its inner button', async () => {
    // nonContentSelectors owns it (.captioned-button-wrap): caption and button are chrome.
    const captionedAttrs = jsonAttrValue({
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
    const expected = '<p>Before.</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should keep FootnoteAnchorToDOM and FootnoteToDOM as plain in-page links', async () => {
    // Passes through: the footnote kind is parked, so the anchor stays inline and the
    // footnote body unwraps into ordinary paragraphs that keep the back link.
    const value = html`
      <p>A claim in the body.<a class="footnote-anchor" data-component-name="FootnoteAnchorToDOM" id="footnote-anchor-1" href="#footnote-1" target="_self">1</a>
      </p>
      <div class="footnote" data-component-name="FootnoteToDOM">
        <a id="footnote-1" href="#footnote-anchor-1" class="footnote-number" contenteditable="false" target="_self">1</a>
        <div class="footnote-content">
          <p>The footnote text.</p>
        </div>
      </div>
    `
    const expected = html`
      <p>A claim in the body.<a class="footnote-anchor" data-component-name="FootnoteAnchorToDOM" id="footnote-anchor-1" href="#footnote-1" target="_self">1</a>
      </p>
      <p>
        <a id="footnote-1" href="#footnote-anchor-1" class="footnote-number" contenteditable="false" target="_self">1</a>
      </p>
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
    const codeAttrs = jsonAttrValue({
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
    const gistAttrs = jsonAttrValue({
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
        <table class="highlight">
          <tbody>
            <tr>
              <td class="blob-code">print("hello")</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <a href="https://gist.github.com/caseyauthor/abc123/raw/">view raw</a> hosted with ❤ by <a href="https://github.com">GitHub</a>
      </p>
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
            ><span class="file-embed-button-text">Download</span>
            </a>
          </div>
          <a
            class="file-embed-button narrow"
            href="https://examplepub.substack.com/api/v1/file/2b9c5d1e-4f3a-4b6c-8d7e-9f0a1b2c3d4e.pdf"
          ><span class="file-embed-button-text">Download</span>
          </a>
        </div>
      </div>
    `
    const expected = html`
      <p>Before.</p>
      <p>Three Poems</p>
      <p>31.9KB ∙ PDF file</p>
      <p>
        <a class="file-embed-button wide" href="https://examplepub.substack.com/api/v1/file/2b9c5d1e-4f3a-4b6c-8d7e-9f0a1b2c3d4e.pdf">
          <span class="file-embed-button-text">Download</span>
        </a>
      </p>
      <p>
        <a class="file-embed-button narrow" href="https://examplepub.substack.com/api/v1/file/2b9c5d1e-4f3a-4b6c-8d7e-9f0a1b2c3d4e.pdf">
          <span class="file-embed-button-text">Download</span>
        </a>
      </p>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should resolve a VimeoToDOM wrap into a vimeo embed placeholder', async () => {
    // The vimeo resolver claims the inner player iframe. The wrap divs dissolve.
    const vimeoAttrs = jsonAttrValue({
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
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should resolve an ApplePodcastToDom iframe into an applepodcasts placeholder', async () => {
    // The apple resolver claims the embed iframe, states the episode player height and takes the
    // card the container carries, whose runtime is in milliseconds because this is an episode.
    const podcastAttrs = jsonAttrValue({
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
        data-embed-thumbnail="https://substack-post-media.s3.amazonaws.com/public/images/podcast-episode_1000500600700.jpg"
        data-embed-height="175"
        data-embed-title="The art of storytelling"
        data-embed-publisher="Example Show"
        data-embed-date="2021-04-04T14:51:00Z"
        data-embed-duration="4419"
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should convert a DatawrapperToDOM chart into its static image', async () => {
    // convertDatawrapperEmbeds owns the iframe. The sibling resize script passes through
    // for the reader to drop.
    const chartAttrs = jsonAttrValue({
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
    const bandcampAttrs = jsonAttrValue({
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
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should resolve a SoundcloudToDOM wrap into a soundcloud embed placeholder', async () => {
    // The soundcloud resolver claims the player iframe, reads the track id off its url and takes
    // the card the wrapper carries.
    const soundcloudAttrs = jsonAttrValue({
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
        data-embed-url="https://soundcloud.com/exampleradio/mix-4"
        data-embed-thumbnail="https://i1.sndcdn.com/artworks-abc-t500x500.jpg"
        data-embed-height="166"
        data-embed-title="Mix 4"
        data-embed-description="Tracklist"
        data-embed-author="Example Radio"
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should fall back the TikTok embed pair to a generic placeholder and its static link', async () => {
    // The generic iframe fallback owns the iframely player (no tiktok resolver claims it),
    // the hidden cookie-check iframe is stripped, and the static thumbnail link survives.
    const tiktokAttrs = jsonAttrValue({
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
      ></div>
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
    // The generic iframe fallback owns the market iframe. Its px-suffixed size attributes
    // do not survive as embed dimensions.
    const marketAttrs = jsonAttrValue({
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
      <div
        data-embed-src="https://manifold.markets/embed/ExampleUser/will-the-thing-happen"
        data-embed-width="560"
        data-embed-height="405"
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should convert a VideoEmbedPlayer web render into a native video element', async () => {
    // substackMediaResolver owns the outer native-video-embed div, so the web-render inner
    // resolves the same way as an empty VideoPlaceholder.
    const playerAttrs = jsonAttrValue({
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

  it('should rebuild a feed-side image gallery from its payload', async () => {
    // fixSubstackGalleries mints the images and resolveMediaDimensions reads their size from
    // the `_WxH` filename suffix.
    const galleryAttrs = jsonAttrValue({
      gallery: {
        images: [
          {
            type: 'image/jpeg',
            src: 'https://cdn.example.com/public/images/0a1b2c3d-4e5f-4a6b-8c7d-000000000001_1500x1000.jpeg',
          },
          {
            type: 'image/jpeg',
            src: 'https://cdn.example.com/public/images/0a1b2c3d-4e5f-4a6b-8c7d-000000000002_1500x1000.jpeg',
          },
        ],
        caption: 'Flowers from a grab bag',
        alt: 'Two bunches of flowers',
        staticGalleryImage: {
          type: 'image/png',
          src: 'https://cdn.example.com/public/images/0a1b2c3d-4e5f-4a6b-8c7d-000000000003_1456x720.png',
        },
      },
      isEditorNode: true,
    })
    const value = html`
      <p>Intro</p>
      <div
        class="image-gallery-embed"
        data-attrs="${galleryAttrs}"
      ></div>
    `
    const expected = html`
      <p>Intro</p>
      <figure>
        <img
          src="https://cdn.example.com/public/images/0a1b2c3d-4e5f-4a6b-8c7d-000000000001_1500x1000.jpeg"
          alt="Two bunches of flowers"
          width="1500"
          height="1000"
        />
        <img
          src="https://cdn.example.com/public/images/0a1b2c3d-4e5f-4a6b-8c7d-000000000002_1500x1000.jpeg"
          alt="Two bunches of flowers"
          width="1500"
          height="1000"
        />
        <figcaption>Flowers from a grab bag</figcaption>
      </figure>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should keep a v1 ImageToDOM img and read its extension-less dimensions', async () => {
    // resolveMediaDimensions owns it: the bare v1 img carries its size only in the
    // extension-less _WxH filename suffix.
    const value = html`
      <p>Text before. <img style="" src="https://substackcdn.com/image/fetch/w_1100,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Faa11bb22-cc33-4d44-8e55-ff6677889900_240x298" data-component-name="ImageToDOM">
      </p>
    `
    const expected = html`
      <p>Text before. <img width="240" height="298" src="https://substackcdn.com/image/fetch/w_1100,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Faa11bb22-cc33-4d44-8e55-ff6677889900_240x298" data-component-name="ImageToDOM">
      </p>
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
    const mentionUserAttrs = jsonAttrValue({
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
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(value)
  })

  it('should convert an EmbeddedPublicationToDOMWithSubscribe promo into a cite placeholder', async () => {
    // substackPublicationCiteResolver owns it. This shape omits base_url from the blob, so the
    // url and the logo come off the anchor and its image instead.
    const publicationAttrs = jsonAttrValue({
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
    const expected = html`
      <p>Before.</p>
      <div
        data-cite-provider="substack"
        data-cite-url="https://otherpub.substack.com?utm_medium=web"
        data-cite-title="Other Pub"
        data-cite-description="A newsletter."
        data-cite-author="Casey Author"
        data-cite-icon="https://substackcdn.com/image/fetch/f_auto/logo.png"
      ></div>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should strip a web-render SubscribeWidget as non-content', async () => {
    // nonContentSelectors owns it ([data-component-name="SubscribeWidget"]): the web form
    // of the subscribe CTA carries no class the editor form shares.
    const value = html`
      <p>Before.</p>
      <div class="subscribe-widget is-signed-up is-fully-subscribed" data-component-name="SubscribeWidget">
        <p class="button-wrapper">
          <a class="button primary" href="https://examplepub.substack.com/subscribe">
            <span>Subscribe</span>
          </a>
        </p>
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
      <p>
        <a
          href="https://substack.com/app/app-store-redirect?utm_campaign=app-marketing"
          target="_blank"
          class="install-substack-app-embed-link"
        ><button class="install-substack-app-embed-btn button primary">Get the app</button>
        </a>
      </p>
      <p>After.</p>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should drop the PaywallToDOM and SponsorshipCampaignToDOM markers', async () => {
    // stripEmptyTags owns them: the paywall jump target and the sponsor ad slot are both
    // empty divs, and removal is the desired end state.
    const sponsorAttrs = jsonAttrValue({
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
    // deletes the empty div. No poll kind exists to park it in.
    const pollAttrs = jsonAttrValue({ id: 123456 })
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
    const commentAttrs = jsonAttrValue({
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
    const chatPostAttrs = jsonAttrValue({
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
    const latexAttrs = jsonAttrValue({
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
    // deleted mid-sentence. No restore is minted for it.
    const cashtagAttrs = jsonAttrValue({ symbol: '$RKLB' })
    const value = html`
      <p>Rocket Lab <span
        class="cashtag-wrap"
        data-attrs="${cashtagAttrs}"
        data-component-name="CashtagToDOM"
      ></span> returned 105% from entry.</p>
    `
    const expected = '<p>Rocket Lab  returned 105% from entry.</p>'
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toEqualHtml(expected)
  })

  it('should drop a RecipeToDOM embed', async () => {
    // Known loss: the recipe ships only its id and the card is rendered server-side, so
    // stripEmptyTags deletes the empty div.
    const recipeAttrs = jsonAttrValue({ id: 12345 })
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
    const polymarketAttrs = jsonAttrValue({
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
