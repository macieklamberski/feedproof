import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'

describeForEachParser('WordPress', (parseHtml) => {
  // convertWidgets claims the embed carriers inside the oEmbed wrapper figures, with
  // getWrapperRatioDimensions reading their wp-embed-aspect-* classes when the carrier
  // states no size. fixLazyIframes and fixLazyImages recover the consent-gate and
  // lazy-loader attribute stashes (defaultLazyIframeAttributes, defaultLazySrcAttributes).
  // The plugin facades are rebuilt by rebuildLyteEmbeds, rebuildRocketYoutubePreviews,
  // rebuildLazyLoadForVideos, rebuildEmbedPlusEmbeds and rebuildElementorVideoEmbeds.
  // convertGalleries turns wp-block-gallery figures into gallery placeholders.
  // An oEmbed block whose provider call failed ships the bare url alone; linkifyUrls makes it a
  // link and unwrapWrappers drops the figure shell around it.
  // wp-embedded-content post embeds are in open PR #361; add that clause when it merges.

  it('should reduce a failed oEmbed block to its linkified url', async () => {
    const value = html`
      <p>Look:</p>
      <figure class="wp-block-embed is-type-rich is-provider-twitter wp-block-embed-twitter">
        <div class="wp-block-embed__wrapper">
          https://twitter.com/someone/status/1234567890123456789
        </div>
      </figure>
    `
    const expected = html`
      <p>Look:</p>
      <p> <a href="https://twitter.com/someone/status/1234567890123456789">https://twitter.com/someone/status/1234567890123456789</a> </p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should convert a wordpress gallery and keep the placeholder through unwrapWrappers', async () => {
    const value = html`
      <figure class="wp-block-gallery has-nested-images columns-2 is-cropped">
        <figure class="wp-block-image">
          <a href="https://example.com/a.jpg"><img src="https://example.com/a-large.jpg" alt="Sunset"></a>
          <figcaption>Day one</figcaption>
        </figure>
        <figure class="wp-block-image"><img src="https://example.com/b-large.jpg"></figure>
        <figcaption class="blocks-gallery-caption">My trip</figcaption>
      </figure>
    `
    const items = JSON.stringify([
      {
        url: 'https://example.com/a-large.jpg',
        fullUrl: 'https://example.com/a.jpg',
        alt: 'Sunset',
        caption: 'Day one',
      },
      { url: 'https://example.com/b-large.jpg' },
    ])
    const expected = html`
      <div
        data-gallery-provider="wordpress"
        data-gallery-title="My trip"
        data-gallery-items='${items}'
      >
        <figure>
          <a href="https://example.com/a.jpg"><img src="https://example.com/a-large.jpg" alt="Sunset"></a>
          <figcaption>Day one</figcaption>
        </figure>
        <figure><img src="https://example.com/b-large.jpg"></figure>
      </div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
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
})
