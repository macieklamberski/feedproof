import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { trimPreWhitespace } from './trimPreWhitespace.js'

const context: TransformContext = {}
const trailingNewlineBeforeCode = /\n<\/code>/

describe('trimPreWhitespace', () => {
  const trim = (html: string) => {
    return transformHtml(html, trimPreWhitespace(context))
  }

  it('should trim trailing newlines from code inside pre', () => {
    const result = trim('<pre><code>const x = 1\n\n</code></pre>')

    expect(result).toContain('<code>const x = 1</code>')
  })

  it('should trim trailing whitespace from bare pre', () => {
    const result = trim('<pre>plain text\n  \n</pre>')

    expect(result).toContain('<pre>plain text</pre>')
  })

  it('should trim leading newlines', () => {
    const result = trim('<pre><code>\n\nconst x = 1</code></pre>')

    expect(result).toContain('<code>const x = 1</code>')
  })

  it('should trim leading whitespace-only lines', () => {
    const result = trim('<pre><code> \nconst x = 1</code></pre>')

    expect(result).toContain('<code>const x = 1</code>')
  })

  it('should trim multiple leading whitespace-only lines', () => {
    const result = trim('<pre><code> \n  \n\nline 1</code></pre>')

    expect(result).toContain('<code>line 1</code>')
  })

  it('should trim leading lines with tabs', () => {
    const result = trim('<pre><code>\t\nline 1</code></pre>')

    expect(result).toContain('<code>line 1</code>')
  })

  it('should trim trailing whitespace from highlighted code', () => {
    const result = trim(
      '<pre><code class="hljs"><span class="hljs-keyword">const</span> x = 1\n\n</code></pre>',
    )

    expect(result).toContain('<span class="hljs-keyword">const</span> x = 1</code>')
    expect(result).not.toMatch(trailingNewlineBeforeCode)
  })

  it('should dedent common leading indentation', () => {
    const result = trim('<pre>    line 1\n    line 2\n      line 3</pre>')

    expect(result).toContain('<pre>line 1\nline 2\n  line 3</pre>')
  })

  it('should dedent inside code element', () => {
    const result = trim('<pre><code>    a\n    b</code></pre>')

    expect(result).toContain('<code>a\nb</code>')
  })

  it('should dedent common tab indentation', () => {
    const result = trim('<pre>\t\tline 1\n\t\tline 2\n\t\t\tline 3</pre>')

    expect(result).toContain('<pre>line 1\nline 2\n\tline 3</pre>')
  })

  it('should not dedent when lines have no common indentation', () => {
    const result = trim('<pre>line 1\n  line 2</pre>')

    expect(result).toContain('<pre>line 1\n  line 2</pre>')
  })

  it('should ignore empty lines when computing common indentation', () => {
    const result = trim('<pre>    line 1\n\n    line 2</pre>')

    expect(result).toContain('<pre>line 1\n\nline 2</pre>')
  })

  it('should not modify pre without trailing whitespace or indentation', () => {
    const result = trim('<pre><code>clean</code></pre>')

    expect(result).toContain('<code>clean</code>')
  })

  it('should handle multiple pre blocks', () => {
    const result = trim('<pre><code>first\n</code></pre><pre><code>second\n</code></pre>')

    expect(result).toContain('<code>first</code>')
    expect(result).toContain('<code>second</code>')
  })

  it('should handle html with no pre blocks', () => {
    const html = '<p>No code here</p>'
    const result = trim(html)

    expect(result).toContain('<p>No code here</p>')
  })
})
