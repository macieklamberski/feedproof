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
  '.embedded-publication-wrap':
    '<div class="embedded-publication-wrap"><a href="https://other.substack.com">Other newsletter</a></div>',
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
  '[class*="social-share"]': '<div class="social-share"><a href="/x">X</a></div>',
  '[class*="share-buttons"]': '<div class="share-buttons"><a href="/fb">Facebook</a></div>',
  '.sharethis-inline-share-buttons': '<div class="sharethis-inline-share-buttons"></div>',
  '.sharedaddy': '<div class="sharedaddy sd-sharing-enabled"></div>',
  '.feedflare': '<div class="feedflare"><a href="/ff">Share</a></div>',
  '.addtoany_share_save_container':
    '<div class="addtoany_share_save_container"><a class="a2a_button_facebook" href="#">Share</a></div>',
  '.a2a_kit': '<span class="a2a_kit a2a_kit_size_32 addtoany_list"></span>',
  '[class*="addthis_"]': '<div class="addthis_toolbox addthis_default_style"></div>',
  '.shareaholic-canvas': '<div class="shareaholic-canvas" data-app="share_buttons"></div>',
  'amp-social-share':
    '<amp-social-share type="twitter" width="60" height="44" data-param-text="Read this"></amp-social-share>',
  '.yarpp-related':
    '<div class="yarpp yarpp-related yarpp-template-list"><h3>Related</h3><ol><li><a href="/a">A</a></li></ol></div>',
  '.jp-relatedposts':
    '<div id="jp-relatedposts" class="jp-relatedposts"><h3 class="jp-relatedposts-headline">Related</h3></div>',
  '.crp_related': '<div class="crp_related"><ul><li><a href="/a">A</a></li></ul></div>',
  '.wp-block-post-author':
    '<div class="wp-block-post-author"><div class="wp-block-post-author__content"><p>Jane</p></div></div>',
  '.saboxplugin-wrap':
    '<div class="saboxplugin-wrap"><div class="saboxplugin-tab"><p>About the author</p></div></div>',
  'a[class*="read-more"]': '<a class="read-more-link" href="/post">Read more</a>',
  'a[class*="continue-reading"]': '<a class="continue-reading" href="/post">Continue reading</a>',
  '.fb-comments': '<div class="fb-comments" data-href="https://example.com/p"></div>',
  '.printfriendly': '<a class="printfriendly" href="#">Print</a>',
  '.pf-button': '<button class="pf-button">Print</button>',
  '.image-link-expand': '<div class="image-link-expand"><button><svg></svg></button></div>',
  'drupal-render-placeholder':
    '<drupal-render-placeholder callback="comment.lazy_builders:renderLinks" arguments="0=node:1"></drupal-render-placeholder>',
  '.mcnPreviewText': '<span class="mcnPreviewText" style="display:none">Preview text</span>',
  '.tmblr-alt-text-helper': '<span class="tmblr-alt-text-helper">ALT</span>',
  'iframe.wp-embedded-content':
    '<iframe class="wp-embedded-content" src="https://example.com/post/embed/#?secret=abc" sandbox="allow-scripts" security="restricted"></iframe>',
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
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripNonContentElements(context)])
  }

  describe('with default selectors', () => {
    it('should have a specimen for every default selector', () => {
      const specimenSelectors = Object.keys(specimens).sort()
      const defaultSelectors = [...defaultNonContentSelectors].sort()

      expect(specimenSelectors).toEqual(defaultSelectors)
    })

    it.each(specimenEntries)('should strip %s', async (_selector, specimen) => {
      const [value, expected] = Array.isArray(specimen) ? specimen : [specimen, '']

      expect(await transform(`<p>Before</p>${value}<p>After</p>`)).toBe(
        `<p>Before</p>${expected}<p>After</p>`,
      )
    })

    // Only the AMP elements that are advertising or tracking by definition are listed. The
    // rest of the vocabulary renders the publisher's own words and stays.
    it('should keep AMP elements that carry content', async () => {
      const value = html`
        <amp-fx-flying-carpet height="300"><p>A scroll-revealed passage.</p></amp-fx-flying-carpet>
        <amp-list src="https://example.com/items.json"><template type="amp-mustache">{{title}}</template></amp-list>
        <amp-accordion><section><h4>Chapter one</h4><p>Body</p></section></amp-accordion>
        <amp-carousel width="600" height="400"><amp-img src="a.jpg"></amp-img></amp-carousel>
        <amp-fit-text width="300" height="80">A headline</amp-fit-text>
        <amp-timeago datetime="2026-08-01T00:00:00Z">1 August 2026</amp-timeago>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should keep a read-more wrapper that holds real content (anchor-scoped)', async () => {
      const value = '<div class="read-more-section"><p>Body</p></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should remove image-link-expand carrying additional classes', async () => {
      const value = html`
        <picture><img src="x.jpg"></picture>
        <div class="image-link-expand extra-class"><button></button></div>
      `
      const expected = '<picture><img src="x.jpg"></picture>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove the Tumblr alt-text badge and keep the image alt it labels', async () => {
      const value = html`
        <figure class="tmblr-full" data-orig-height="814" data-orig-width="1000">
          <img src="photo.jpg" alt="A cat asleep on a windowsill"><span class="tmblr-alt-text-helper">ALT</span>
        </figure>
      `
      const expected =
        '<figure class="tmblr-full" data-orig-height="814" data-orig-width="1000"><img src="photo.jpg" alt="A cat asleep on a windowsill"></figure>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove SubscribeWidget regardless of the host tag', async () => {
      const value = html`
        <section data-component-name="SubscribeWidget">Inner</section>
        <p>After</p>
      `
      const expected = '<p>After</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should not match elements with a different data-component-name', async () => {
      const value = '<div data-component-name="ShareWidget">Share</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave unrelated iframes and forms untouched', async () => {
      const value = html`
        <iframe src="https://example.com/embed"></iframe>
        <form action="/search"><input name="q"></form>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should remove both Substack and Drupal markers in the same document', async () => {
      const value = html`
        <picture><img src="x.jpg"></picture>
        <div class="image-link-expand"><button></button></div>
        <p>article</p>
        <drupal-render-placeholder
          callback="comment.lazy_builders:renderLinks"
        >
        </drupal-render-placeholder>
      `
      const expected = html`
        <picture><img src="x.jpg"></picture>
        <p>article</p>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should remove multiple matches of the same selector', async () => {
      const value = html`
        <div class="image-link-expand"><button>1</button></div>
        <div class="image-link-expand"><button>2</button></div>
      `
      const expected = ''

      expect(await transform(value)).toBe(expected)
    })

    it('should leave document untouched when no non-content elements are present', async () => {
      const value = html`
        <p>article text</p>
        <figure><img src="x.jpg"></figure>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should not touch unrelated classes containing "expand"', async () => {
      const value = '<div class="expand-collapse"><span>still here</span></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave non-Drupal custom elements untouched', async () => {
      const value = '<lite-youtube videoid="abc"></lite-youtube>'

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = html`
        <picture><img src="x.jpg"></picture>
        <div class="image-link-expand"><button><svg></svg></button></div>
      `
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })

  describe('with caller-supplied selectors', () => {
    it('should remove elements matching a custom tag selector', async () => {
      const context: TransformContext = { ...baseContext, nonContentSelectors: ['custom-widget'] }
      const value = html`
        <p>before</p>
        <custom-widget data-x="1"></custom-widget>
        <p>after</p>
      `
      const expected = html`
        <p>before</p>
        <p>after</p>
      `

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove elements matching a custom class selector', async () => {
      const context: TransformContext = { ...baseContext, nonContentSelectors: ['.ad-slot'] }
      const value = html`
        <p>before</p>
        <div class="ad-slot">ad</div>
        <p>after</p>
      `
      const expected = html`
        <p>before</p>
        <p>after</p>
      `

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove elements matching any of several selectors', async () => {
      const context: TransformContext = {
        ...baseContext,
        nonContentSelectors: ['.promo-box', 'newsletter-signup'],
      }
      const value = html`
        <div class="promo-box">Try our app</div>
        <p>keep</p>
        <newsletter-signup></newsletter-signup>
        <div class="other">keep</div>
      `
      const expected = html`
        <p>keep</p>
        <div class="other">keep</div>
      `

      expect(await transform(value, context)).toBe(expected)
    })

    it('should no-op when selector list is empty', async () => {
      const context: TransformContext = { ...baseContext, nonContentSelectors: [] }
      const value = html`
        <div class="image-link-expand"><button></button></div>
        <p>kept</p>
      `

      expect(await transform(value, context)).toBe(value)
    })
    // The same wrapper with its player intact is a working embed, not chrome. Only the shells
    // whose iframe the feed generator removed are stripped.
    it('should keep an s9e wrapper whose player survived', async () => {
      const value = html`
        <span data-s9e-mediaembed="youtube">
          <span><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></span>
        </span>
      `

      expect(await transform(value)).toBe(value)
    })
  })
})
