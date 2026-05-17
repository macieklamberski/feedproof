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
import { stripDuplicateTitleHeading } from './stripDuplicateTitleHeading.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripDuplicateTitleHeading', () => {
  const transform = (html: string, context: TransformContext) => {
    return transformHtml(html, stripDuplicateTitleHeading(context))
  }

  describe('happy paths', () => {
    it('should remove first H1 that exactly matches the title', async () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove first H2 when it matches the title', async () => {
      const value = '<h2>Breaking News Today</h2><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove heading when title differs only by case', async () => {
      const value = '<h1>BREAKING NEWS TODAY</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'breaking news today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove heading when title differs only by surrounding whitespace', async () => {
      const value = '<h1>\n  Breaking News Today\n</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove heading containing inline formatting that matches title text', async () => {
      const value = '<h1>The <em>real</em> story</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'The real story' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should remove heading when text has collapsed multi-space whitespace', async () => {
      const value = '<h1>The   real   story</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'The real story' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toBe(expected)
    })

    it('should only remove the first matching heading, not subsequent occurrences', async () => {
      const value = '<h1>The Title</h1><p>Body.</p><h1>The Title</h1>'
      const context: TransformContext = { ...baseContext, articleTitle: 'The Title' }
      const expected = '<p>Body.</p><h1>The Title</h1>'

      expect(await transform(value, context)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content alone when title is undefined', async () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'

      expect(await transform(value, baseContext)).toBe(value)
    })

    it('should leave content alone when title is empty string', async () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: '' }

      expect(await transform(value, context)).toBe(value)
    })

    it('should leave content alone when title is whitespace only', async () => {
      const value = '<h1>Breaking News Today</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: '   ' }

      expect(await transform(value, context)).toBe(value)
    })

    it('should leave content alone when first heading does not match title', async () => {
      const value = '<h1>Different Heading</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toBe(value)
    })

    it('should leave content alone when document has no headings', async () => {
      const value = '<p>Article body without any heading.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toBe(value)
    })

    it('should not remove a later heading even if it matches when first does not', async () => {
      const value = '<h1>Different</h1><p>Body.</p><h2>Breaking News Today</h2>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toBe(value)
    })

    it('should leave content alone when title differs by punctuation', async () => {
      const value = '<h1>Breaking News Today</h1><p>Body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today!' }

      expect(await transform(value, context)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = '<h1>Breaking News Today</h1><p>Body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const once = await transform(value, context)
      const twice = await transform(once, context)

      expect(twice).toBe(once)
    })
  })
})
