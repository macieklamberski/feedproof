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
