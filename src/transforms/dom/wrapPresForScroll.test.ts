import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { wrapPresForScroll } from './wrapPresForScroll.js'

describeForEachParser('wrapPresForScroll', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [wrapPresForScroll(context)])
  }

  describe('happy paths', () => {
    it('should wrap a pre in a div data-pre', async () => {
      const value = '<pre>code</pre>'
      const expected = '<div data-pre=""><pre>code</pre></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap multiple sibling pres independently', async () => {
      const value = '<pre>A</pre><pre>B</pre>'
      const expected = '<div data-pre=""><pre>A</pre></div><div data-pre=""><pre>B</pre></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve the pre attributes and inner markup', async () => {
      const value = '<pre class="hljs"><code>const x = 1</code></pre>'
      const expected = '<div data-pre=""><pre class="hljs"><code>const x = 1</code></pre></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should keep surrounding content intact', async () => {
      const value = '<p>Before</p><pre>code</pre><p>After</p>'
      const expected = '<p>Before</p><div data-pre=""><pre>code</pre></div><p>After</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content without pres unchanged', async () => {
      const value = '<p>No pres here</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = '<pre>code</pre>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should not stack wrappers when applied multiple times to the same document', async () => {
      const value = '<pre>code</pre>'
      const expected = '<div data-pre=""><pre>code</pre></div>'
      const context = baseContext
      const result = await applyDomTransforms(parseHtml(value), [
        wrapPresForScroll(context),
        wrapPresForScroll(context),
        wrapPresForScroll(context),
      ])

      expect(result).toBe(expected)
    })

    it('should not re-wrap a pre already in a div data-pre', async () => {
      const value = '<div data-pre=""><pre>code</pre></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should add its own wrapper around a pre inside an author div', async () => {
      const value = '<div class="highlight"><pre>code</pre></div>'
      const expected = '<div class="highlight"><div data-pre=""><pre>code</pre></div></div>'

      expect(await transform(value)).toBe(expected)
    })
  })
})
