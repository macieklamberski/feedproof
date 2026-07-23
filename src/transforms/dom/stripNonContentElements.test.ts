import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripNonContentElements } from './stripNonContentElements.js'

describeForEachParser('stripNonContentElements', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripNonContentElements(context)])
  }

  describe('with default selectors', () => {
    // Widgets added from the 2026-07 corpus scan. Each pair is [label, the widget markup].
    const scannedWidgets: Array<[string, string]> = [
      ['AddToAny', '<span class="a2a_kit a2a_kit_size_32 addtoany_list"></span>'],
      ['AddThis', '<div class="addthis_toolbox addthis_default_style"></div>'],
      ['Shareaholic', '<div class="shareaholic-canvas" data-app="share_buttons"></div>'],
      ['Google Ad Manager', '<div id="div-gpt-ad-1234567890"></div>'],
      ['Bloom optin', '<div class="et_bloom"><input type="email"></div>'],
      ['WPForms', '<div class="wpforms-container"><form></form></div>'],
      ['Thrive Leads', '<div class="tve-leads-conversion-object"></div>'],
      ['Facebook Comments', '<div class="fb-comments" data-href="https://example.com/p"></div>'],
      ['PrintFriendly link', '<a class="printfriendly" href="#">Print</a>'],
      ['PrintFriendly button', '<button class="pf-button">Print</button>'],
    ]

    it.each(scannedWidgets)('should strip a %s widget', async (_label, widget) => {
      expect(await transform(`<p>Before</p>${widget}<p>After</p>`)).toBe(
        '<p>Before</p><p>After</p>',
      )
    })

    it('should remove a read-more truncation link', async () => {
      const value = '<p>Excerpt</p><a class="read-more-link" href="/post">Read more</a>'

      expect(await transform(value)).toBe('<p>Excerpt</p>')
    })

    it('should keep a read-more wrapper that holds real content (anchor-scoped)', async () => {
      const value = '<div class="read-more-section"><p>Body</p></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should remove a social-share button cluster', async () => {
      const value = '<p>Body</p><div class="social-share"><a href="/x">X</a></div>'

      expect(await transform(value)).toBe('<p>Body</p>')
    })

    it('should remove a FeedBurner feedflare footer', async () => {
      const value = '<p>Body</p><div class="feedflare"><a href="/ff">Share</a></div>'

      expect(await transform(value)).toBe('<p>Body</p>')
    })

    it('should remove Substack image-link-expand sibling of picture', async () => {
      const value = html`
        <picture><img src="x.jpg"></picture>
        <div class="image-link-expand"><button><svg></svg></button></div>
      `
      const expected = '<picture><img src="x.jpg"></picture>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove image-link-expand with nested restack and zoom buttons', async () => {
      const value = html`
        <div class="image-link-expand">
          <div class="pencraft pc-display-flex pc-gap-8 pc-reset">
            <button class="restack-image"><svg></svg></button>
            <button class="zoom-image"><svg></svg></button>
          </div>
        </div>
      `
      const expected = ''

      expect(await transform(value)).toBe(expected)
    })

    it('should remove image-link-expand carrying additional classes', async () => {
      const value = html`
        <picture><img src="x.jpg"></picture>
        <div class="image-link-expand extra-class"><button></button></div>
      `
      const expected = '<picture><img src="x.jpg"></picture>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Substack SubscribeWidget with nested form controls', async () => {
      const value = html`
        <p>Hello</p>
        <div data-component-name="SubscribeWidget">
          <input type="email">
          <button>Subscribe</button>
        </div>
        <p>World</p>
      `
      const expected = html`
        <p>Hello</p>
        <p>World</p>
      `

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

    it('should remove Substack subscription-widget-wrap-editor paywall block', async () => {
      const value = html`
        <p>Preview</p>
        <div class="subscription-widget-wrap-editor">
          <div class="subscription-widget"><h2>Keep reading with a 7-day free trial</h2></div>
        </div>
      `
      const expected = '<p>Preview</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Substack captioned-button-wrap share block', async () => {
      const value = html`
        <p>Body</p>
        <div class="captioned-button-wrap">
          <div class="preamble"><p class="cta-caption">Thanks for reading! This post is public so feel free to share it.</p></div>
          <p class="button-wrapper"><a class="button primary" href="https://example.com/p/post?action=share"><span>Share</span></a></p>
        </div>
      `
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Ghost kg-signup-card', async () => {
      const value = html`
        <article>
          <p>Body</p>
          <div class="kg-card kg-signup-card" data-lexical-signup-form><h2>Subscribe</h2></div>
        </article>
      `
      const expected = '<article><p>Body</p></article>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Beehiiv embed iframe by src host', async () => {
      const value = html`
        <p>Before</p>
        <iframe src="https://embeds.beehiiv.com/72773897-9d0c" width="100%" height="320"></iframe>
        <p>After</p>
      `
      const expected = html`
        <p>Before</p>
        <p>After</p>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Buttondown form by action host', async () => {
      const value = html`
        <p>Before</p>
        <form action="https://buttondown.email/api/emails/embed-subscribe/foo" method="post">
          <input name="email">
        </form>
        <p>After</p>
      `
      const expected = html`
        <p>Before</p>
        <p>After</p>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should leave unrelated iframes and forms untouched', async () => {
      const value = html`
        <iframe src="https://example.com/embed"></iframe>
        <form action="/search"><input name="q"></form>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should remove Google AdSense ins slot', async () => {
      const value = html`
        <p>Before</p>
        <ins
          class="adsbygoogle"
          style="display:block"
          data-ad-client="ca-pub-x"
          data-ad-slot="123"
        >
        </ins>
        <p>After</p>
      `
      const expected = html`
        <p>Before</p>
        <p>After</p>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should remove YARPP related-posts widget', async () => {
      const value = html`
        <p>Body</p>
        <div class="yarpp yarpp-related yarpp-related-rss yarpp-template-list">
          <h3>Related</h3>
          <ol><li><a href="/a">A</a></li></ol>
        </div>
      `
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove ShareThis and Sharedaddy share-button blocks', async () => {
      const value = html`
        <p>Body</p>
        <div class="sharethis-inline-share-buttons"></div>
        <div class="sharedaddy sd-sharing-enabled"></div>
      `
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove WordPress Gutenberg author bio block', async () => {
      const value = html`
        <p>Body</p>
        <div class="wp-block-post-author">
          <div class="wp-block-post-author__avatar"><img src="x"></div>
          <div class="wp-block-post-author__content"><p>Jane</p></div>
        </div>
      `
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Mailchimp hidden preheader span', async () => {
      const value = html`
        <span class="mcnPreviewText" style="display:none">Preview text</span>
        <p>Body</p>
      `
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Drupal render placeholder for comment links', async () => {
      const value = html`
        <article>body<drupal-render-placeholder
          callback="comment.lazy_builders:renderLinks"
          arguments="0=node:1"
        >
        </drupal-render-placeholder></article>
      `
      const expected = '<article>body</article>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Drupal render placeholder for comment form', async () => {
      const value = html`
        <drupal-render-placeholder
          callback="comment.lazy_builders:renderForm"
          arguments="0=node:42"
        >
        </drupal-render-placeholder>
        <p>after</p>
      `
      const expected = '<p>after</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Drupal render placeholder for flag links', async () => {
      const value =
        '<drupal-render-placeholder callback="flag.link_builder:build"></drupal-render-placeholder>'
      const expected = ''

      expect(await transform(value)).toBe(expected)
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
  })
})
