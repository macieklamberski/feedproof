import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import type { TransformContext } from '../../types.js'
import { stripDuplicateTitleHeading } from './stripDuplicateTitleHeading.js'

describe('stripDuplicateTitleHeading', () => {
  describe('happy paths', () => {
    it('should remove first H1 that exactly matches the title', () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(expected)
    })

    it('should remove first H2 when it matches the title', () => {
      const value = '<h2>Breaking News Today</h2><p>Article body.</p>'
      const context: TransformContext = { articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(expected)
    })

    it('should remove heading when title differs only by case', () => {
      const value = '<h1>BREAKING NEWS TODAY</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: 'breaking news today' }
      const expected = '<p>Article body.</p>'

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(expected)
    })

    it('should remove heading when title differs only by surrounding whitespace', () => {
      const value = '<h1>\n  Breaking News Today\n</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(expected)
    })

    it('should remove heading containing inline formatting that matches title text', () => {
      const value = '<h1>The <em>real</em> story</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: 'The real story' }
      const expected = '<p>Article body.</p>'

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(expected)
    })

    it('should remove heading when text has collapsed multi-space whitespace', () => {
      const value = '<h1>The   real   story</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: 'The real story' }
      const expected = '<p>Article body.</p>'

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(expected)
    })

    it('should only remove the first matching heading, not subsequent occurrences', () => {
      const value = '<h1>The Title</h1><p>Body.</p><h1>The Title</h1>'
      const context: TransformContext = { articleTitle: 'The Title' }
      const expected = '<p>Body.</p><h1>The Title</h1>'

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content alone when title is undefined', () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'
      const context: TransformContext = {}

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(value)
    })

    it('should leave content alone when title is empty string', () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: '' }

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(value)
    })

    it('should leave content alone when title is whitespace only', () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: '   ' }

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(value)
    })

    it('should leave content alone when first heading does not match title', () => {
      const value = '<h1>Different Heading</h1><p>Article body.</p>'
      const context: TransformContext = { articleTitle: 'Breaking News Today' }

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(value)
    })

    it('should leave content alone when document has no headings', () => {
      const value = '<p>Article body without any heading.</p>'
      const context: TransformContext = { articleTitle: 'Breaking News Today' }

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(value)
    })

    it('should not remove a later heading even if it matches when first does not', () => {
      const value = '<h1>Different</h1><p>Body.</p><h2>Breaking News Today</h2>'
      const context: TransformContext = { articleTitle: 'Breaking News Today' }

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(value)
    })

    it('should leave content alone when title differs by punctuation', () => {
      const value = '<h1>Breaking News Today</h1><p>Body.</p>'
      const context: TransformContext = { articleTitle: 'Breaking News Today!' }

      expect(transformHtml(value, stripDuplicateTitleHeading(context))).toBe(value)
    })

    it('should be idempotent', () => {
      const value = '<h1>Breaking News Today</h1><p>Body.</p>'
      const context: TransformContext = { articleTitle: 'Breaking News Today' }
      const once = transformHtml(value, stripDuplicateTitleHeading(context))
      const twice = transformHtml(once, stripDuplicateTitleHeading(context))

      expect(twice).toBe(once)
    })
  })
})
