import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { unwrapNestedCodeWrappers } from './unwrapNestedCodeWrappers.js'

describeForEachParser('unwrapNestedCodeWrappers', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [unwrapNestedCodeWrappers(context)])
  }

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

    expect(twice).toBe(once)
  })
})
