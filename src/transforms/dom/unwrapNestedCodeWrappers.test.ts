import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { unwrapNestedCodeWrappers } from './unwrapNestedCodeWrappers.js'

describeForEachParser('unwrapNestedCodeWrappers', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [unwrapNestedCodeWrappers(context)])
  }

  describe('code nested in code, pre in pre', () => {
    it('should collapse a code directly nested in a code', async () => {
      const value = '<pre><code><code><span>The fat cat sat on the mat</span></code></code></pre>'
      const expected = '<pre><code><span>The fat cat sat on the mat</span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should collapse a pre directly nested in a pre', async () => {
      const value = '<pre><pre>code line</pre></pre>'
      const expected = '<pre>code line</pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should collapse triple-nested code to a single wrapper', async () => {
      const value = '<code><code><code>x</code></code></code>'
      const expected = '<code>x</code>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a standard pre > code pair unchanged', async () => {
      const value = '<pre><code>const x = 1</code></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not collapse when the parent also holds meaningful text', async () => {
      const value = '<code>before <code>inner</code></code>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not collapse when the parent has other element children', async () => {
      const value = '<code><code>a</code><span>b</span></code>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should be idempotent', async () => {
      const value = '<pre><code><code>x</code></code></pre>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })

  describe('styling wrapper between pre and code', () => {
    it('should lift a code out of a span wrapper inside a pre', async () => {
      const value = '<pre><span><code>const x = 1</code></span></pre>'
      const expected = '<pre><code>const x = 1</code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should lift the code even when the pre holds a sibling label', async () => {
      const value = '<pre><span><code>const x = 1</code></span><small>PHP</small></pre>'
      const expected = '<pre><code>const x = 1</code><small>PHP</small></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should lift a code out of stacked wrappers', async () => {
      const value = '<pre><div><span><code>const x = 1</code></span></div></pre>'
      const expected = '<pre><code>const x = 1</code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not lift when the wrapper has other element children', async () => {
      const value = '<pre><span><code>const x = 1</code><button>Copy</button></span></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not lift when the wrapper holds meaningful text', async () => {
      const value = '<pre><span>$ <code>bun install</code></span></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not unwrap a link wrapping the code', async () => {
      const value = '<pre><a href="https://example.com"><code>const x = 1</code></a></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })
})
