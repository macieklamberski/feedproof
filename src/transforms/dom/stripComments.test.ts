import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { stripComments } from './stripComments.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripComments', () => {
  const transform = (html: string) => {
    return transformHtml(html, stripComments(context))
  }

  describe('happy paths', () => {
    it('should remove a single comment', async () => {
      expect(await transform('<!-- hidden -->')).toBe('')
    })

    it('should remove multiple comments', async () => {
      expect(await transform('<!-- one --><p>text</p><!-- two -->')).toBe('<p>text</p>')
    })

    it('should remove a comment between elements', async () => {
      expect(await transform('<p>First</p><!-- separator --><p>Second</p>')).toBe(
        '<p>First</p><p>Second</p>',
      )
    })

    it('should remove a comment containing newlines', async () => {
      expect(await transform('<p>before</p><!--\n  multiline\n  body\n--><p>after</p>')).toBe(
        '<p>before</p><p>after</p>',
      )
    })

    it('should remove a conditional comment', async () => {
      expect(await transform('<!--[if IE]><p>legacy</p><![endif]--><p>main</p>')).toBe(
        '<p>main</p>',
      )
    })

    it('should remove a comment inside a paragraph', async () => {
      expect(await transform('<p>Hello <!-- inline --> world</p>')).toBe('<p>Hello  world</p>')
    })

    it('should remove an unterminated comment', async () => {
      expect(await transform('<p>before</p><!-- unterminated')).toBe('<p>before</p>')
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
      expect(await transform('<p>foo<!-- mid -->bar</p>')).toBe('<p>foobar</p>')
    })

    it('should handle empty string', async () => {
      expect(await transform('')).toBe('')
    })
  })
})
