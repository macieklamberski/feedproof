import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import { parseHtml } from '../../parsers/linkedom.js'
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
    return applyDomTransforms(parseHtml(html), [stripComments(context)])
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
})
