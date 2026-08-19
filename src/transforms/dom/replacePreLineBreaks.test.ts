import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { replacePreLineBreaks } from './replacePreLineBreaks.js'

describeForEachParser('replacePreLineBreaks', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [replacePreLineBreaks(context)])
  }

  it('should replace br with newline inside pre', async () => {
    const value = '<pre>line 1<br>line 2</pre>'
    const expected = '<pre>line 1\nline 2</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should replace self-closing br', async () => {
    const value = '<pre>line 1<br/>line 2</pre>'
    const expected = '<pre>line 1\nline 2</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should replace br with space before slash', async () => {
    const value = '<pre>line 1<br />line 2</pre>'
    const expected = '<pre>line 1\nline 2</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should replace multiple br tags', async () => {
    const value = '<pre>a<br>b<br>c</pre>'
    const expected = '<pre>a\nb\nc</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should target code inside pre', async () => {
    const value = '<pre><code>a<br>b</code></pre>'
    const expected = '<pre><code>a\nb</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not affect br outside pre', async () => {
    const value = '<p>line 1<br>line 2</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not modify content without pre elements', async () => {
    const value = '<p>plain paragraph</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should handle empty input', async () => {
    expect(await transform('')).toBe('')
  })

  it('should not stack extra entity encoding inside xmp', async () => {
    // linkedom's parser/serializer already double-encodes entities inside
    // `<xmp>` once (a known parser quirk). The transform must not add a
    // second round-trip on top of that. The output should be byte-identical
    // to running an identity DOM transform on the same input.
    const value = '<pre><code><xmp>&lt;p&gt;Hi&lt;/p&gt;</xmp></code></pre>'
    const result = await transform(value)
    const baseline = await applyDomTransforms(parseHtml(value), [() => {}])

    expect(result).toBe(baseline)
  })

  it('should be idempotent', async () => {
    const value = '<pre>line 1<br>line 2</pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
