import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import type { TransformContext } from '../../types.js'
import { stripComments } from './stripComments.js'

const context: TransformContext = {}

describe('stripComments', () => {
  describe('happy paths', () => {
    it('should remove a single comment', () => {
      const value = '<!-- hidden -->'
      const expected = ''

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })

    it('should remove multiple comments', () => {
      const value = '<!-- one --><p>text</p><!-- two -->'
      const expected = '<p>text</p>'

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })

    it('should remove a comment between elements', () => {
      const value = '<p>First</p><!-- separator --><p>Second</p>'
      const expected = '<p>First</p><p>Second</p>'

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })

    it('should remove a comment containing newlines', () => {
      const value = '<p>before</p><!--\n  multiline\n  body\n--><p>after</p>'
      const expected = '<p>before</p><p>after</p>'

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })

    it('should remove a conditional comment', () => {
      const value = '<!--[if IE]><p>legacy</p><![endif]--><p>main</p>'
      const expected = '<p>main</p>'

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })

    it('should remove a comment inside a paragraph', () => {
      const value = '<p>Hello <!-- inline --> world</p>'
      const expected = '<p>Hello  world</p>'

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })

    it('should remove an unterminated comment', () => {
      const value = '<p>before</p><!-- unterminated'
      const expected = '<p>before</p>'

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should preserve comments inside pre blocks', () => {
      const value = '<pre>let x = 1; <!-- inline --></pre>'

      expect(transformHtml(value, stripComments(context))).toBe(value)
    })

    it('should preserve comments inside code blocks', () => {
      const value = '<code>let x = 1; <!-- inline --></code>'

      expect(transformHtml(value, stripComments(context))).toBe(value)
    })

    it('should preserve comments inside nested pre and code blocks', () => {
      const value = '<pre><code><!-- nested --></code></pre>'

      expect(transformHtml(value, stripComments(context))).toBe(value)
    })

    it('should preserve comment-like text inside attribute values', () => {
      const value = '<a title="<!-- safe -->">link</a>'

      expect(transformHtml(value, stripComments(context))).toBe(value)
    })

    it('should leave content unchanged when there are no comments', () => {
      const value = '<p>Plain content with no comments</p>'

      expect(transformHtml(value, stripComments(context))).toBe(value)
    })

    it('should leave entity-encoded comment text unchanged', () => {
      const value = '<p>Use &lt;!-- comment --&gt; in HTML</p>'

      expect(transformHtml(value, stripComments(context))).toBe(value)
    })

    it('should merge surrounding text when comment has no adjacent whitespace', () => {
      const value = '<p>foo<!-- mid -->bar</p>'
      const expected = '<p>foobar</p>'

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })

    it('should handle empty string', () => {
      const value = ''
      const expected = ''

      expect(transformHtml(value, stripComments(context))).toBe(expected)
    })
  })
})
