import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { replacePreLineBreaks } from './replacePreLineBreaks.js'

describeForEachParser('replacePreLineBreaks', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [replacePreLineBreaks(context)])
  }

  it('should replace br with newline inside pre', async () => {
    const value = '<pre>line 1<br>line 2</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2</pre>')
  })

  it('should replace self-closing br', async () => {
    const value = '<pre>line 1<br/>line 2</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2</pre>')
  })

  it('should replace br with space before slash', async () => {
    const value = '<pre>line 1<br />line 2</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2</pre>')
  })

  it('should replace multiple br tags', async () => {
    const value = '<pre>a<br>b<br>c</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>a\nb\nc</pre>')
  })

  it('should target code inside pre', async () => {
    const value = '<pre><code>a<br>b</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>a\nb</code>')
  })

  it('should not affect br outside pre', async () => {
    const value = '<p>line 1<br>line 2</p>'
    const result = await transform(value)

    expect(result).toContain('<br>')
  })

  it('should not stack extra entity encoding inside xmp', async () => {
    // linkedom's parser/serializer already double-encodes entities inside
    // `<xmp>` once (a known parser quirk). The transform must not add a
    // second round-trip on top of that — the output should be byte-identical
    // to running an identity DOM transform on the same input.
    const value = '<pre><code><xmp>&lt;p&gt;Hi&lt;/p&gt;</xmp></code></pre>'
    const result = await transform(value)
    const baseline = await applyDomTransforms(parseHtml(value), [() => {}])

    expect(result).toBe(baseline)
  })
})
