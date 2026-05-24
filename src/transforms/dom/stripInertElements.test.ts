import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { parseHtml } from '../../parsers/linkedom.js'
import { baseContext } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripInertElements } from './stripInertElements.js'

describe('stripInertElements', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripInertElements(context)])
  }

  describe('with default selectors', () => {
    it('should remove Substack image-link-expand sibling of picture', async () => {
      const value =
        '<picture><img src="x.jpg"></picture><div class="image-link-expand"><button><svg></svg></button></div>'
      const expected = '<picture><img src="x.jpg"></picture>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove image-link-expand with nested restack and zoom buttons', async () => {
      const value =
        '<div class="image-link-expand"><div class="pencraft pc-display-flex pc-gap-8 pc-reset"><button class="restack-image"><svg></svg></button><button class="zoom-image"><svg></svg></button></div></div>'
      const expected = ''

      expect(await transform(value)).toBe(expected)
    })

    it('should remove image-link-expand carrying additional classes', async () => {
      const value =
        '<picture><img src="x.jpg"></picture><div class="image-link-expand extra-class"><button></button></div>'
      const expected = '<picture><img src="x.jpg"></picture>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Substack SubscribeWidget with nested form controls', async () => {
      const value =
        '<p>Hello</p><div data-component-name="SubscribeWidget"><input type="email"><button>Subscribe</button></div><p>World</p>'
      const expected = '<p>Hello</p><p>World</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove SubscribeWidget regardless of the host tag', async () => {
      const value = '<section data-component-name="SubscribeWidget">Inner</section><p>After</p>'
      const expected = '<p>After</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should not match elements with a different data-component-name', async () => {
      const value = '<div data-component-name="ShareWidget">Share</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should remove Substack subscription-widget-wrap-editor paywall block', async () => {
      const value =
        '<p>Preview</p><div class="subscription-widget-wrap-editor"><div class="subscription-widget"><h2>Keep reading with a 7-day free trial</h2></div></div>'
      const expected = '<p>Preview</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Ghost kg-signup-card', async () => {
      const value =
        '<article><p>Body</p><div class="kg-card kg-signup-card" data-lexical-signup-form><h2>Subscribe</h2></div></article>'
      const expected = '<article><p>Body</p></article>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Beehiiv embed iframe by src host', async () => {
      const value =
        '<p>Before</p><iframe src="https://embeds.beehiiv.com/72773897-9d0c" width="100%" height="320"></iframe><p>After</p>'
      const expected = '<p>Before</p><p>After</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Buttondown form by action host', async () => {
      const value =
        '<p>Before</p><form action="https://buttondown.email/api/emails/embed-subscribe/foo" method="post"><input name="email"></form><p>After</p>'
      const expected = '<p>Before</p><p>After</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave unrelated iframes and forms untouched', async () => {
      const value =
        '<iframe src="https://example.com/embed"></iframe><form action="/search"><input name="q"></form>'

      expect(await transform(value)).toBe(value)
    })

    it('should remove Google AdSense ins slot', async () => {
      const value =
        '<p>Before</p><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-x" data-ad-slot="123"></ins><p>After</p>'
      const expected = '<p>Before</p><p>After</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Substack cross-publication promo wrap', async () => {
      const value =
        '<p>Body</p><div class="embedded-publication-wrap" data-attrs="{}"><a href="https://other.substack.com">Other Newsletter</a></div>'
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove YARPP related-posts widget', async () => {
      const value =
        '<p>Body</p><div class="yarpp yarpp-related yarpp-related-rss yarpp-template-list"><h3>Related</h3><ol><li><a href="/a">A</a></li></ol></div>'
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove ShareThis and Sharedaddy share-button blocks', async () => {
      const value =
        '<p>Body</p><div class="sharethis-inline-share-buttons"></div><div class="sharedaddy sd-sharing-enabled"></div>'
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove WordPress Gutenberg author bio block', async () => {
      const value =
        '<p>Body</p><div class="wp-block-post-author"><div class="wp-block-post-author__avatar"><img src="x"></div><div class="wp-block-post-author__content"><p>Jane</p></div></div>'
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Mailchimp hidden preheader span', async () => {
      const value =
        '<span class="mcnPreviewText" style="display:none">Preview text</span><p>Body</p>'
      const expected = '<p>Body</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Drupal render placeholder for comment links', async () => {
      const value =
        '<article>body<drupal-render-placeholder callback="comment.lazy_builders:renderLinks" arguments="0=node:1"></drupal-render-placeholder></article>'
      const expected = '<article>body</article>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove Drupal render placeholder for comment form', async () => {
      const value =
        '<drupal-render-placeholder callback="comment.lazy_builders:renderForm" arguments="0=node:42"></drupal-render-placeholder><p>after</p>'
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
      const value =
        '<picture><img src="x.jpg"></picture><div class="image-link-expand"><button></button></div><p>article</p><drupal-render-placeholder callback="comment.lazy_builders:renderLinks"></drupal-render-placeholder>'
      const expected = '<picture><img src="x.jpg"></picture><p>article</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove multiple matches of the same selector', async () => {
      const value =
        '<div class="image-link-expand"><button>1</button></div><div class="image-link-expand"><button>2</button></div>'
      const expected = ''

      expect(await transform(value)).toBe(expected)
    })

    it('should leave document untouched when no inert elements are present', async () => {
      const value = '<p>article text</p><figure><img src="x.jpg"></figure>'

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
  })

  describe('with caller-supplied selectors', () => {
    it('should remove elements matching a custom tag selector', async () => {
      const context: TransformContext = { ...baseContext, inertSelectors: ['custom-widget'] }
      const value = '<p>before</p><custom-widget data-x="1"></custom-widget><p>after</p>'
      const expected = '<p>before</p><p>after</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove elements matching a custom class selector', async () => {
      const context: TransformContext = { ...baseContext, inertSelectors: ['.ad-slot'] }
      const value = '<p>before</p><div class="ad-slot">ad</div><p>after</p>'
      const expected = '<p>before</p><p>after</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove elements matching any of several selectors', async () => {
      const context: TransformContext = {
        ...baseContext,
        inertSelectors: ['.foo', 'bar-widget'],
      }
      const value =
        '<div class="foo">x</div><p>keep</p><bar-widget></bar-widget><div class="other">keep</div>'
      const expected = '<p>keep</p><div class="other">keep</div>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should no-op when selector list is empty', async () => {
      const context: TransformContext = { ...baseContext, inertSelectors: [] }
      const value = '<div class="image-link-expand"><button></button></div><p>kept</p>'

      expect(await transform(value, context)).toBe(value)
    })
  })
})
