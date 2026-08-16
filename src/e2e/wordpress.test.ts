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
      const expected = html`
        <div
          data-embed-height="315"
          data-embed-width="560"
          data-embed-thumbnail="https://i.ytimg.com/vi/0OqYNLrUoes/hqdefault.jpg"
          data-embed-url="https://www.youtube.com/watch?v=0OqYNLrUoes"
          data-embed-id="0OqYNLrUoes"
          data-embed-provider="youtube"
          data-embed-src="https://www.youtube.com/embed/0OqYNLrUoes"
        ></div>
      `

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })
  })
})
