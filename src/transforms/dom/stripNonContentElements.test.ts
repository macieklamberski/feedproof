import { describe, expect, it } from 'bun:test'
import { defaultNonContentSelectors } from '../../defaults.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripNonContentElements } from './stripNonContentElements.js'

// One real-world specimen per default selector, keyed by the selector itself. The completeness
// test below keeps this table in lockstep with defaultNonContentSelectors, so a selector cannot
// be added (or removed) without its specimen.
// A specimen is removed whole, or [input, expected] when the selector strips a child and the
// element around it must survive.
const specimens: Record<string, string | [string, string]> = {
  '[data-component-name="SubscribeWidget"]':
    '<div data-component-name="SubscribeWidget"><input type="email"><button>Subscribe</button></div>',
  '.subscription-widget-wrap-editor':
    '<div class="subscription-widget-wrap-editor"><div class="subscription-widget"><h2>Keep reading with a 7-day free trial</h2></div></div>',
  'iframe[src*=".substack.com/"][src$="/embed"]':
    '<iframe src="https://other.substack.com/embed" width="480" height="320"></iframe>',
  '.wp-block-jetpack-subscriptions':
    '<div class="wp-block-jetpack-subscriptions"><form><input type="email"></form></div>',
  '.kg-signup-card':
    '<div class="kg-card kg-signup-card" data-lexical-signup-form><h2>Subscribe</h2></div>',
  '.mc4wp-form': '<form class="mc4wp-form" method="post"><input type="email" name="EMAIL"></form>',
  '.formkit-form': '<form class="formkit-form" data-sv-form="123456"><input type="email"></form>',
  'iframe[src*="embeds.beehiiv.com"]':
    '<iframe src="https://embeds.beehiiv.com/72773897-9d0c" height="320"></iframe>',
  '.jetpack_subscription_widget':
    '<div class="jetpack_subscription_widget"><form><input type="email"></form></div>',
  'form[action*="buttondown.email"]':
    '<form action="https://buttondown.email/api/emails/embed-subscribe/foo" method="post"><input name="email"></form>',
  '.sqs-block-newsletter':
    '<div class="sqs-block newsletter-block sqs-block-newsletter"><form><input type="email"></form></div>',
  '.wpforms-container': '<div class="wpforms-container"><form></form></div>',
  '[class*="tve-leads"]': '<div class="tve-leads-conversion-object"></div>',
  '.adsbygoogle':
    '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-x" data-ad-slot="123"></ins>',
  'div[id^="div-gpt-ad"]': '<div id="div-gpt-ad-1234567890"></div>',
  '.adthrive-ad': '<div class="adthrive-ad adthrive-content"></div>',
  'amp-ad':
    '<amp-ad width="100vw" height="320" type="adsense" data-ad-client="ca-pub-1234567890123456" data-ad-slot="1234567890" data-auto-format="rspv" data-full-width layout="fixed"></amp-ad>',
  'amp-auto-ads':
    '<amp-auto-ads type="adsense" data-ad-client="ca-pub-1234567890123456"></amp-auto-ads>',
  'amp-sticky-ad':
    '<amp-sticky-ad layout="nodisplay"><amp-ad width="320" height="50" type="doubleclick" data-slot="/4119129/sticky"></amp-ad></amp-sticky-ad>',
  'amp-sticky-ad-top-padding':
    '<amp-sticky-ad-top-padding class="amp-sticky-ad-top-padding"></amp-sticky-ad-top-padding>',
  'amp-pixel':
    '<amp-pixel src="https://www16.a8.net/0.gif?a8=abcdef" layout="nodisplay"></amp-pixel>',
  'amp-analytics':
    '<amp-analytics type="googleanalytics" data-credentials="include"><script type="application/json">{"vars":{"account":"UA-12345-6"}}</script></amp-analytics>',
  '.captioned-button-wrap':
    '<div class="captioned-button-wrap"><p class="button-wrapper"><a class="button primary" href="https://example.com/p/post?action=share"><span>Share</span></a></p></div>',
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="/subscribe"])':
    '<p class="button-wrapper" data-component-name="ButtonCreateButton"><a class="button primary" href="https://example.com/subscribe?"><span>Subscribe now</span></a></p>',
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="/comments"])':
    '<p class="button-wrapper" data-component-name="ButtonCreateButton"><a class="button primary" href="https://example.com/p/post/comments"><span>Leave a comment</span></a></p>',
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="action=share"])':
    '<p class="button-wrapper" data-component-name="ButtonCreateButton"><a class="button primary" href="https://example.com/p/post?action=share"><span>Share</span></a></p>',
  '[class*="social-share"]': '<div class="social-share"><a href="/x">X</a></div>',
  '[class*="share-buttons"]': '<div class="share-buttons"><a href="/fb">Facebook</a></div>',
  '.sharethis-inline-share-buttons': '<div class="sharethis-inline-share-buttons"></div>',
  '.sharedaddy': '<div class="sharedaddy sd-sharing-enabled"></div>',
  '.feedflare': '<div class="feedflare"><a href="/ff">Share</a></div>',
  '.addtoany_share_save_container':
    '<div class="addtoany_share_save_container"><a class="a2a_button_facebook" href="#">Share</a></div>',
  'iframe[src*="facebook.com/plugins/like.php"]':
    '<iframe src="http://www.facebook.com/plugins/like.php?href=https://example.com/post/&amp;layout=standard&amp;show_faces=1&amp;width=450&amp;action=like" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:450px; height:25px"></iframe>',
  '.a2a_kit': '<span class="a2a_kit a2a_kit_size_32 addtoany_list"></span>',
  '[class*="addthis_"]': '<div class="addthis_toolbox addthis_default_style"></div>',
  '.shareaholic-canvas': '<div class="shareaholic-canvas" data-app="share_buttons"></div>',
  'amp-social-share':
    '<amp-social-share type="twitter" width="60" height="44" data-param-text="Read this"></amp-social-share>',
  '.wp-block-social-links':
    '<ul class="wp-block-social-links is-layout-flex wp-block-social-links-is-layout-flex"><li class="wp-social-link wp-social-link-linkedin wp-block-social-link"><a href="https://www.linkedin.com/company/acme/" class="wp-block-social-link-anchor"><svg viewBox="0 0 24 24"><path d="M12 4.6"></path></svg><span class="wp-block-social-link-label screen-reader-text">LinkedIn</span></a></li></ul>',
  '.et_pb_social_media_follow':
    '<ul class="et_pb_social_media_follow et_pb_module et_pb_social_media_follow_0 clearfix"><li class="et_pb_social_icon et_pb_social_network_link et-social-linkedin et_pb_social_media_follow_network_2"><a href="https://www.linkedin.com/in/funtraining1/" class="icon et_pb_with_border" title="LinkedIn"><span class="et_pb_social_media_follow_network_name">LinkedIn</span></a></li></ul>',
  '.elementor-social-icons-wrapper':
    '<div class="elementor-social-icons-wrapper elementor-grid"><span class="elementor-grid-item"><a class="elementor-icon elementor-social-icon elementor-social-icon-linkedin elementor-repeater-item-32fb565" href="https://www.linkedin.com/company/acme/" target="_blank"><span class="elementor-screen-only">Linkedin</span><i class="fab fa-linkedin"></i></a></span></div>',
  '.rrssb-buttons':
    '<ul class="rrssb-buttons"><li class="rrssb-linkedin"><a href="https://www.linkedin.com/shareArticle?mini=true&amp;url=https%3A%2F%2Fexample.com%2Fpost" class="popup"><span class="rrssb-icon"></span><span class="rrssb-text">linkedin</span></a></li></ul>',
  '.simplesocialbuttons':
    '<div class="simplesocialbuttons simplesocial-sm-round simplesocialbuttons_inline simplesocialbuttons-align-left"><button rel="nofollow" target="_blank" class="simplesocial-linkedin-share" aria-label="LinkedIn Share" data-href="https://www.linkedin.com/sharing/share-offsite/?url=https://example.com/post"><span class="simplesocialtxt">LinkedIn</span></button></div>',
  '[data-key="social-share"]':
    '<div data-label="Social Share" data-key="social-share" data-atomgroup="module" id="m-1765185492477" class="module-wrap" data-icon="eicon-social-icons" data-ver="1.0"><div class="module gf_module-left" data-modelink="auto"><a href="#" title="facebook" data-sharetext="Share" data-sharein="popup" class="gf_social gf_social-facebook"><i class="fa fa-facebook" aria-hidden="true"></i><span class="gf_social-label">Share</span></a><a href="#" title="pinterest" data-sharetext="Pin it" data-sharein="popup" class="gf_social gf_social-pinterest"><i class="fa fa-pinterest" aria-hidden="true"></i><span class="gf_social-label">Pin it</span></a></div></div>',
  'a.synved-social-button':
    '<a class="synved-social-button synved-social-button-share synved-social-size-24 synved-social-provider-linkedin nolightbox" data-provider="linkedin" target="_blank" rel="nofollow" title="Share on Linkedin" href="https://www.linkedin.com/shareArticle?mini=true&amp;url=https%3A%2F%2Fexample.com%2Fpost"><img alt="Linkedin" title="Share on Linkedin" class="synved-share-image synved-social-image synved-social-image-share" width="24" height="24" src="https://example.com/wp-content/plugins/social-media-feather/synved-social/image/social/regular/48x48/linkedin.png"></a>',
  '.av-share-box':
    '<div class="av-share-box"><h5 class="av-share-link-description av-no-toc">Share this entry</h5><ul class="av-share-box-list noLightbox"><li class="av-share-link av-social-link-linkedin"><a target="_blank" href="https://linkedin.com/shareArticle?mini=true&amp;title=A%20post&amp;url=https://example.com/post" aria-hidden="true" data-av_icon="" data-av_iconfont="entypo-fontello"><span class="avia_hidden_link_text">Share on LinkedIn</span></a></li></ul></div>',
  '[class*="elementor-share-buttons"]':
    '<div class="elementor-element elementor-share-buttons--view-icon elementor-share-buttons--skin-flat elementor-widget-share-buttons"><div class="elementor-widget-container"><div class="elementor-grid"><div class="elementor-share-btn elementor-share-btn_facebook"><span class="elementor-share-btn__title">Facebook</span></div></div></div></div>',
  '[class*="heateor_sss"]':
    '<div class="heateor_sss_sharing_container heateor_sss_horizontal_sharing"><div class="heateor_sss_sharing_ul"><a class="heateor_sss_facebook" href="https://example.com/share/facebook"><span class="heateor_sss_svg"></span></a></div></div>',
  '.mashsb-container':
    '<aside class="mashsb-container mashsb-main"><div class="mashsb-buttons"><a href="https://example.com/share/facebook" class="mashicon-facebook"><span class="text">Share</span></a></div></aside>',
  '.ssbp-wrap':
    '<div class="ssba-classic-2 ssba ssbp-wrap alignleft ssbp--theme-1"><div style="text-align:left"><span class="ssba-share-text">Share this</span><a data-site="facebook" class="ssba_facebook_share ssba_share_link" href="https://example.com/share/facebook">Facebook</a></div></div>',
  '.swp_social_panel':
    '<div class="swp_social_panel swp_horizontal_panel swp_flat_fresh" data-min-width="1100"><div class="nc_tweetContainer swp_share_button"><a class="nc_tweet swp_share_link" href="https://example.com/share/facebook"><span class="swp_share">Share</span></a></div></div>',
  '.yarpp-related':
    '<div class="yarpp yarpp-related yarpp-template-list"><h3>Related</h3><ol><li><a href="/a">A</a></li></ol></div>',
  '.jp-relatedposts':
    '<div id="jp-relatedposts" class="jp-relatedposts"><h3 class="jp-relatedposts-headline">Related</h3></div>',
  '.crp_related': '<div class="crp_related"><ul><li><a href="/a">A</a></li></ul></div>',
  '.zergnet-widget':
    '<div class="zergnet-widget widget-loaded"><div class="zerglayoutcl"><div class="zergrow"><div class="zergentity"><a href="https://example.com/story">A story you might like</a></div></div></div></div>',
  '.wp-block-post-author':
    '<div class="wp-block-post-author"><div class="wp-block-post-author__content"><p>Jane</p></div></div>',
  '.saboxplugin-wrap':
    '<div class="saboxplugin-wrap"><div class="saboxplugin-tab"><p>About the author</p></div></div>',
  'a[class*="read-more"]': '<a class="read-more-link" href="/post">Read more</a>',
  'a[class*="continue-reading"]': '<a class="continue-reading" href="/post">Continue reading</a>',
  '.fb-comments': '<div class="fb-comments" data-href="https://example.com/p"></div>',
  '.printfriendly': '<a class="printfriendly" href="#">Print</a>',
  '.pf-button': '<button class="pf-button">Print</button>',
  'nav.breadcrumb':
    '<nav class="mb-6 flex items-center gap-2 breadcrumb"><a href="https://example.com/"><img src="https://example.com/home.png" alt="Home" width="16" height="16"></a><span class="breadcrumb-divider">/</span><a href="https://example.com/blog/category/business">Business</a></nav>',
  'nav.breadcrumbs':
    '<nav class="breadcrumbs"><a href="https://example.com/">Home</a> &raquo; <a href="https://example.com/news/">News</a></nav>',
  'nav[aria-label^="breadcrumb" i]':
    '<nav aria-label="Breadcrumbs"><div class="breadcrumb-container"><a href="https://example.com/">Home</a> / <span>Guides</span></div></nav>',
  '[role="navigation"][aria-label^="breadcrumb" i]':
    '<div role="navigation" aria-label="Breadcrumbs"><ol><li><a href="https://example.com/">Home</a></li><li>Docs</li></ol></div>',
  '.aioseo-breadcrumbs':
    '<div class="aioseo-breadcrumbs"><span class="aioseo-breadcrumb"><a href="https://example.com/">Home</a></span><span class="aioseo-breadcrumb-separator">&raquo;</span><span class="aioseo-breadcrumb">Recipes</span></div>',
  '.rt-reading-time': [
    '<p><span class="span-reading-time rt-reading-time" style="display: block;"><span class="rt-label rt-prefix">Reading Time: </span> <span class="rt-time"> 6</span> <span class="rt-label rt-postfix">minutes</span></span>Building in public once helped me.</p>',
    '<p>Building in public once helped me.</p>',
  ],
  '.yoast-reading-time__wrapper':
    '<p class="wp-block-yoast-seo-estimated-reading-time yoast-reading-time__wrapper"><span class="yoast-reading-time__icon"><svg aria-hidden="true" width="20" height="20"><path d="M12 8v4l3 3"></path></svg></span><span class="yoast-reading-time__spacer" style="display:inline-block;width:1em"></span><span class="yoast-reading-time__descriptive-text">Estimated reading time: </span><span class="yoast-reading-time__reading-time">6</span><span class="yoast-reading-time__time-unit"> minutes</span></p>',
  '.booster-read-block':
    '<div class="booster-block booster-read-block"><div class="twp-read-time"><i class="booster-icon twp-clock"></i> <span>Read Time:</span>6 Minute, 55 Second</div></div>',
  '.bsf-rt-reading-time':
    '<span class="bsf-rt-reading-time"><span class="bsf-rt-display-label" prefix=""></span> <span class="bsf-rt-display-time" reading_time="2"></span> <span class="bsf-rt-display-postfix" postfix="minute read"></span></span>',
  '.reading-time-article':
    '<span class="reading-time reading-time-article"><i class="far fa-file-alt" aria-hidden="true"></i> <span class="d-none d-sm-inline">Lesezeit: </span>3 Minuten</span>',
  '.reading-time-teaser':
    '<span class="reading-time reading-time-teaser"><i class="far fa-file-alt" aria-hidden="true"></i> 3 Minuten</span>',
  'a.rcptr':
    '<a class="rcptr" data-raflid="0b78662439" data-template="" data-theme="classic" href="https://example.com/rafl/display/0b78662439/" id="rcwidget_cq72wtxg" rel="nofollow">a Rafflecopter giveaway</a>',
  'a.rafl':
    '<a class="rafl" href="https://example.com/rafl/display/70b9a02412/" id="rc-70b9a02412" rel="nofollow">a Rafflecopter giveaway</a>',
  'a.e-widget':
    '<a class="e-widget no-button" href="https://example.com/3wKIE/win-100-amazon-gift-card" rel="nofollow">Win $100 Amazon Gift Card</a>',
  '.image-link-expand': '<div class="image-link-expand"><button><svg></svg></button></div>',
  'drupal-render-placeholder':
    '<drupal-render-placeholder callback="comment.lazy_builders:renderLinks" arguments="0=node:1"></drupal-render-placeholder>',
  '.mcnPreviewText': '<span class="mcnPreviewText" style="display:none">Preview text</span>',
  '.tmblr-alt-text-helper': '<span class="tmblr-alt-text-helper">ALT</span>',
  'img[src*="steamcommunity.com"][src*="placeholder"]':
    '<img src="https://cdn.steamcommunity.com/news/placeholder_video.gif">',
  'script[consent-original-src-_]':
    '<script type="text/plain" consent-original-src-_="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>',
  '.cookieconsent-optout-marketing':
    '<div class="cookieconsent-optout-marketing"><a href="javascript:Cookiebot.renew()">Please accept marketing cookies to see this content.</a></div>',
  '.pec-overlay':
    '<div class="pec-overlay pec-active"><div class="pec-box"><p>This content is blocked. Accept cookies to watch it.</p></div></div>',
  '.onetrust-css-video-wrapper .fallback-container': [
    '<div class="onetrust-css-video-wrapper"><div class="fallback-container"><img class="fallback-bg" src="https://i.ytimg.com/vi/x/maxresdefault.jpg"><p>Enable cookies to view this content.</p></div><iframe class="optanon-category-C0004" data-src="https://www.youtube.com/embed/x"></iframe></div>',
    '<div class="onetrust-css-video-wrapper"><iframe class="optanon-category-C0004" data-src="https://www.youtube.com/embed/x"></iframe></div>',
  ],
  '[class*="et_bloom"]':
    '<div class="et_bloom_inline_form"><form><input type="email"><button>Subscribe</button></form></div>',
  'a.addtoany_share_save': '<a class="a2a_button_facebook addtoany_share_save">Share</a>',
  'a.twitter-share-button':
    '<a href="https://twitter.com/share" class="twitter-share-button" data-via="someone">Tweet</a>',
  '.vm-like-button':
    '<div class="vm-like-button"><span class="pt-like-it-not"><button class="like-button" data-href="https://example.com/wp-admin/admin-ajax.php?action=pt_like_it&amp;post_id=25556" data-id="25556" data-modus="activity"><span class="like-icon"><i class="far fa-heart"></i></span>&nbsp;<span class="like-count">3</span></button></span></div>',
  'div.easy_social_box': [
    '<div class="easy_social_box"><div class="easy_social-widget"><iframe src="https://www.facebook.com/plugins/like.php?href=https%3A%2F%2Fexample.com"></iframe></div></div>',
    '',
  ],
  'span[data-s9e-mediaembed]:not(:has(iframe, embed, object, video, audio))':
    '<span data-s9e-mediaembed="youtube" style="display:inline-block;max-width:640px"><span style="padding-bottom:56.25%"> <strong>iframe</strong> </span></span>',
  '.fusion-privacy-placeholder':
    '<div class="fusion-privacy-placeholder" data-privacy-type="youtube"><div class="fusion-privacy-label">For privacy reasons YouTube needs your permission to be loaded.</div></div>',
  'amp-consent':
    '<amp-consent id="consent" layout="nodisplay"><script type="application/json">{"consentInstanceId":"abc","promptUI":"consent-ui"}</script><div id="consent-ui"><p>We use cookies to personalise content and ads.</p><button on="tap:consent.accept">Accept</button></div></amp-consent>',
}

const specimenEntries = Object.entries(specimens)

describeForEachParser('stripNonContentElements', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [stripNonContentElements(context)])
  }

  describe('with default selectors', () => {
    it('should have a specimen for every default selector', () => {
      const specimenSelectors = Object.keys(specimens).sort()
      const defaultSelectors = [...defaultNonContentSelectors].sort()

      expect(specimenSelectors).toEqual(defaultSelectors)
    })

    it.each(specimenEntries)('should strip %s', async (_selector, specimen) => {
      const [value, expected] = Array.isArray(specimen) ? specimen : [specimen, '']

      expect(await transform(`<p>Before</p>${value}<p>After</p>`)).toEqualHtml(
        `<p>Before</p>${expected}<p>After</p>`,
      )
    })

    // Only the AMP elements that are advertising or tracking by definition are listed. The
    // rest of the vocabulary renders the publisher's own words and stays.
    it('should keep AMP elements that carry content', async () => {
      const value = html`
        <amp-fx-flying-carpet height="300">
          <p>A scroll-revealed passage.</p>
        </amp-fx-flying-carpet>
        <amp-list src="https://example.com/items.json">
          <template type="amp-mustache">{{title}}</template>
        </amp-list>
        <amp-accordion>
          <section>
            <h4>Chapter one</h4>
            <p>Body</p>
          </section>
        </amp-accordion>
        <amp-carousel width="600" height="400">
          <amp-img src="a.jpg"></amp-img>
        </amp-carousel>
        <amp-fit-text width="300" height="80">A headline</amp-fit-text>
        <amp-timeago datetime="2026-08-01T00:00:00Z">1 August 2026</amp-timeago>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    // Each social cluster is matched on its own vendor namespace, so the neighbouring blocks and
    // widgets those same page builders emit around the post body have to survive untouched.
    it('should keep the page-builder blocks that neighbour the social clusters', async () => {
      const value = html`
        <figure class="wp-block-image size-large">
          <img src="photo.jpg" alt="A photo">
        </figure>
        <div class="elementor-widget-container">
          <p>Body text</p>
        </div>
        <ul class="et_pb_text">
          <li>A list item</li>
        </ul>
        <div class="av-content-box">
          <p>More body text</p>
        </div>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep a read-more wrapper that holds real content (anchor-scoped)', async () => {
      const value = '<div class="read-more-section"><p>Body</p></div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should remove image-link-expand carrying additional classes', async () => {
      const value = html`
        <picture>
          <img src="x.jpg">
        </picture>
        <div class="image-link-expand extra-class">
          <button></button>
        </div>
      `
      const expected = '<picture><img src="x.jpg"></picture>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove the Tumblr alt-text badge and keep the image alt it labels', async () => {
      const value = html`
        <figure class="tmblr-full" data-orig-height="814" data-orig-width="1000">
          <img src="photo.jpg" alt="A cat asleep on a windowsill">
          <span class="tmblr-alt-text-helper">ALT</span>
        </figure>
      `
      const expected = html`
        <figure class="tmblr-full" data-orig-height="814" data-orig-width="1000">
          <img src="photo.jpg" alt="A cat asleep on a windowsill">
        </figure>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove SubscribeWidget regardless of the host tag', async () => {
      const value = html`
        <section data-component-name="SubscribeWidget">Inner</section>
        <p>After</p>
      `
      const expected = '<p>After</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not match elements with a different data-component-name', async () => {
      const value = '<div data-component-name="ShareWidget">Share</div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave unrelated iframes and forms untouched', async () => {
      const value = html`
        <iframe src="https://example.com/embed"></iframe>
        <form action="/search">
          <input name="q">
        </form>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should remove both Substack and Drupal markers in the same document', async () => {
      const value = html`
        <picture>
          <img src="x.jpg">
        </picture>
        <div class="image-link-expand">
          <button></button>
        </div>
        <p>article</p>
        <drupal-render-placeholder
          callback="comment.lazy_builders:renderLinks"
        >
        </drupal-render-placeholder>
      `
      const expected = html`
        <picture>
          <img src="x.jpg">
        </picture>
        <p>article</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove multiple matches of the same selector', async () => {
      const value = html`
        <div class="image-link-expand">
          <button>1</button>
        </div>
        <div class="image-link-expand">
          <button>2</button>
        </div>
      `
      const expected = ''

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave document untouched when no non-content elements are present', async () => {
      const value = html`
        <p>article text</p>
        <figure>
          <img src="x.jpg">
        </figure>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not touch unrelated classes containing "expand"', async () => {
      const value = '<div class="expand-collapse"><span>still here</span></div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave non-Drupal custom elements untouched', async () => {
      const value = '<lite-youtube videoid="abc"></lite-youtube>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should be idempotent', async () => {
      const value = html`
        <picture>
          <img src="x.jpg">
        </picture>
        <div class="image-link-expand">
          <button>
            <svg></svg>
          </button>
        </div>
      `
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })

  describe('scoped selectors', () => {
    // The same wrapper with its player intact is a working embed, not chrome. Only the shells
    // whose iframe the feed generator removed are stripped.
    it('should keep an s9e wrapper whose player survived', async () => {
      const value = html`
        <span data-s9e-mediaembed="youtube">
          <span>
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
          </span>
        </span>
      `

      expect(await transform(value)).toEqualHtml(value)
    })
  })
})
