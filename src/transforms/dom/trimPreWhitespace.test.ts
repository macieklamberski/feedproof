import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { trimPreWhitespace } from './trimPreWhitespace.js'

describeForEachParser('trimPreWhitespace', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [trimPreWhitespace(context)])
  }

  it('should trim trailing newlines from code inside pre', async () => {
    const value = '<pre><code>const x = 1\n\n</code></pre>'
    const expected = '<pre><code>const x = 1</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should trim trailing whitespace from bare pre', async () => {
    const value = '<pre>plain text\n  \n</pre>'
    const expected = '<pre>plain text</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should collapse a whitespace-only pre to an empty pre', async () => {
    const value = '<pre>\n   \n</pre>'
    const expected = '<pre></pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should leave an empty pre unchanged', async () => {
    const value = '<pre></pre>'

    expect(await transform(value)).toBe(value)
  })

  it('should trim leading newlines', async () => {
    const value = '<pre><code>\n\nconst x = 1</code></pre>'
    const expected = '<pre><code>const x = 1</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should trim leading whitespace-only lines', async () => {
    const value = '<pre><code> \nconst x = 1</code></pre>'
    const expected = '<pre><code>const x = 1</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should trim multiple leading whitespace-only lines', async () => {
    const value = '<pre><code> \n  \n\nline 1</code></pre>'
    const expected = '<pre><code>line 1</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should trim leading lines with tabs', async () => {
    const value = '<pre><code>\t\nline 1</code></pre>'
    const expected = '<pre><code>line 1</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should trim trailing whitespace from highlighted code', async () => {
    const value =
      '<pre><code class="hljs"><span class="hljs-keyword">const</span> x = 1\n\n</code></pre>'
    const expected =
      '<pre><code class="hljs"><span class="hljs-keyword">const</span> x = 1</code></pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should dedent common leading indentation', async () => {
    const value = '<pre>    line 1\n    line 2\n      line 3</pre>'
    const expected = '<pre>line 1\nline 2\n  line 3</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should dedent inside code element', async () => {
    const value = '<pre><code>    a\n    b</code></pre>'
    const expected = '<pre><code>a\nb</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should dedent common tab indentation', async () => {
    const value = '<pre>\t\tline 1\n\t\tline 2\n\t\t\tline 3</pre>'
    const expected = '<pre>line 1\nline 2\n\tline 3</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not dedent when lines have no common indentation', async () => {
    const value = '<pre>line 1\n  line 2</pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should dedent indentation that sits inside per-line wrapper spans', async () => {
    const value =
      '<pre><code><span class="line">  a</span>\n<span class="line">    b</span></code></pre>'
    const expected =
      '<pre><code><span class="line">a</span>\n<span class="line">  b</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should ignore an empty line span when computing the common indentation', async () => {
    const value =
      '<pre><code><span class="line"></span>\n<span class="line">  a</span>\n<span class="line">    b</span></code></pre>'
    const expected =
      '<pre><code><span class="line"></span>\n<span class="line">a</span>\n<span class="line">  b</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should dedent common non-breaking-space indentation', async () => {
    const value = '<pre><code>&nbsp;&nbsp;a\n&nbsp;&nbsp;&nbsp;&nbsp;b</code></pre>'
    const expected = '<pre><code>a\n&nbsp;&nbsp;b</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should ignore empty lines when computing common indentation', async () => {
    const value = '<pre>    line 1\n\n    line 2</pre>'
    const expected = '<pre>line 1\n\nline 2</pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not modify pre without trailing whitespace or indentation', async () => {
    const value = '<pre><code>clean</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should trim a leading blank line when the last child is an element', async () => {
    const value = '<pre>\n<span>x</span></pre>'
    const expected = '<pre><span>x</span></pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should trim a trailing newline when the first child is an element', async () => {
    const value = '<pre><span>x</span>\n</pre>'
    const expected = '<pre><span>x</span></pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should handle multiple pre blocks', async () => {
    const value = '<pre><code>first\n</code></pre><pre><code>second\n</code></pre>'
    const expected = '<pre><code>first</code></pre><pre><code>second</code></pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should handle html with no pre blocks', async () => {
    const value = '<p>No code here</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not stack extra entity encoding when no trimming is needed', async () => {
    // <pre><code><xmp>…</xmp></code></pre> has nothing to trim. The transform
    // must skip the innerHTML write so linkedom doesn't double-escape the
    // raw-text entities inside <xmp> a second time.
    const value = '<pre><code><xmp>&lt;p&gt;Hi&lt;/p&gt;</xmp></code></pre>'
    const result = await transform(value)
    const baseline = await applyDomTransforms(parseHtml(value), [() => {}])

    expect(result).toBe(baseline)
  })

  it('should trim trailing whitespace and dedent together', async () => {
    const value = '<pre><code>    line 1\n    line 2  \n</code></pre>'
    const expected = '<pre><code>line 1\nline 2</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should handle blocks with very many lines without overflowing the stack', async () => {
    const lines = Array.from({ length: 200000 }, () => '  x').join('\n')
    const value = `<pre><code>${lines}\n</code></pre>`

    expect(await transform(value)).toContain('<code>x\nx')
  })

  it('should be idempotent', async () => {
    const value = '<pre><code>const x = 1\n\n</code></pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
