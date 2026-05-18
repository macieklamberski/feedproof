import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { stripComments } from './stripComments.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripComments', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, stripComments(context))
  }

  describe('happy paths', () => {
    it('should remove a single comment', async () => {
      const value = '<!-- hidden -->'
      const expected = ''

      expect(await transform(value)).toBe(expected)
    })

    it('should remove multiple comments', async () => {
      const value = '<!-- one --><p>text</p><!-- two -->'
      const expected = '<p>text</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove a comment between elements', async () => {
      const value = '<p>First</p><!-- separator --><p>Second</p>'
      const expected = '<p>First</p><p>Second</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove a comment containing newlines', async () => {
      const value = '<p>before</p><!--\n  multiline\n  body\n--><p>after</p>'
      const expected = '<p>before</p><p>after</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove a conditional comment', async () => {
      const value = '<!--[if IE]><p>legacy</p><![endif]--><p>main</p>'
      const expected = '<p>main</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove a comment inside a paragraph', async () => {
      const value = '<p>Hello <!-- inline --> world</p>'
      const expected = '<p>Hello  world</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove an unterminated comment', async () => {
      const value = '<p>before</p><!-- unterminated'
      const expected = '<p>before</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should preserve comments inside pre blocks', async () => {
      const value = '<pre>let x = 1; <!-- inline --></pre>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve comments inside code blocks', async () => {
      const value = '<code>let x = 1; <!-- inline --></code>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve comments inside nested pre and code blocks', async () => {
      const value = '<pre><code><!-- nested --></code></pre>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve comment-like text inside attribute values', async () => {
      const value = '<a title="<!-- safe -->">link</a>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave content unchanged when there are no comments', async () => {
      const value = '<p>Plain content with no comments</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave entity-encoded comment text unchanged', async () => {
      const value = '<p>Use &lt;!-- comment --&gt; in HTML</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should merge surrounding text when comment has no adjacent whitespace', async () => {
      const value = '<p>foo<!-- mid -->bar</p>'
      const expected = '<p>foobar</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should handle empty string', async () => {
      const value = ''
      const expected = ''

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('CDATA-shaped comments', () => {
    it('should unwrap a comment shaped like <!--[CDATA[ ... ]]--> into HTML', async () => {
      const result = await transform('<!--[CDATA[<p>real article</p>]]-->')

      expect(result).toBe('<p>real article</p>')
    })

    it('should unwrap with surrounding whitespace inside the wrapper', async () => {
      const result = await transform('<!-- [CDATA[ <p>article</p> ]] -->')

      expect(result.trim()).toBe('<p>article</p>')
    })

    it('should unwrap a CDATA-shaped comment alongside real content', async () => {
      const result = await transform('<h1>title</h1><!--[CDATA[<p>body</p>]]-->')

      expect(result).toBe('<h1>title</h1><p>body</p>')
    })

    it('should not unwrap regular comments that lack the CDATA shape', async () => {
      const result = await transform('<p>foo</p><!-- this is not CDATA -->')

      expect(result).toBe('<p>foo</p>')
    })

    it('should preserve a CDATA-shaped comment inside <pre>', async () => {
      const value = '<pre><!--[CDATA[example]]--></pre>'

      expect(await transform(value)).toBe(value)
    })

    it('should unwrap nested HTML inside CDATA-shaped comment correctly', async () => {
      const result = await transform(
        '<!--[CDATA[<div class="x"><p>nested</p><img src="a.jpg"></div>]]-->',
      )

      expect(result).toBe('<div class="x"><p>nested</p><img src="a.jpg"></div>')
    })

    it('should unwrap CDATA whose body contains an internal --> (split comment)', async () => {
      // The HTML5 parser closes the outer comment at the first internal `-->`,
      // splitting the wrapper into a comment + trailing text. Reconstruct the
      // original source by walking forward and unwrap once.
      const value = '<!--[CDATA[<p>before</p><!--StartFragment--><p>after</p>]]-->'
      const result = await transform(value)

      expect(result).toContain('<p>before</p>')
      expect(result).toContain('<p>after</p>')
      expect(result).not.toContain('[CDATA[')
      expect(result).not.toContain(']]')
    })

    it('should unwrap CDATA whose body contains multiple internal --> markers', async () => {
      const value = '<!--[CDATA[<p>x</p><!--A--><p>y</p><!--B--><p>z</p>]]-->'
      const result = await transform(value)

      expect(result).toContain('<p>x</p>')
      expect(result).toContain('<p>y</p>')
      expect(result).toContain('<p>z</p>')
    })
  })
})
