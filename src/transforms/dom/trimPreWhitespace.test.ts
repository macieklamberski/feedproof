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
import { trimPreWhitespace } from './trimPreWhitespace.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}
const trailingNewlineBeforeCode = /\n<\/code>/

describe('trimPreWhitespace', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, trimPreWhitespace(context))
  }

  it('should trim trailing newlines from code inside pre', async () => {
    const value = '<pre><code>const x = 1\n\n</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>const x = 1</code>')
  })

  it('should trim trailing whitespace from bare pre', async () => {
    const value = '<pre>plain text\n  \n</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>plain text</pre>')
  })

  it('should trim leading newlines', async () => {
    const value = '<pre><code>\n\nconst x = 1</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>const x = 1</code>')
  })

  it('should trim leading whitespace-only lines', async () => {
    const value = '<pre><code> \nconst x = 1</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>const x = 1</code>')
  })

  it('should trim multiple leading whitespace-only lines', async () => {
    const value = '<pre><code> \n  \n\nline 1</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>line 1</code>')
  })

  it('should trim leading lines with tabs', async () => {
    const value = '<pre><code>\t\nline 1</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>line 1</code>')
  })

  it('should trim trailing whitespace from highlighted code', async () => {
    const value =
      '<pre><code class="hljs"><span class="hljs-keyword">const</span> x = 1\n\n</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<span class="hljs-keyword">const</span> x = 1</code>')
    expect(result).not.toMatch(trailingNewlineBeforeCode)
  })

  it('should dedent common leading indentation', async () => {
    const value = '<pre>    line 1\n    line 2\n      line 3</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2\n  line 3</pre>')
  })

  it('should dedent inside code element', async () => {
    const value = '<pre><code>    a\n    b</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>a\nb</code>')
  })

  it('should dedent common tab indentation', async () => {
    const value = '<pre>\t\tline 1\n\t\tline 2\n\t\t\tline 3</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2\n\tline 3</pre>')
  })

  it('should not dedent when lines have no common indentation', async () => {
    const value = '<pre>line 1\n  line 2</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\n  line 2</pre>')
  })

  it('should ignore empty lines when computing common indentation', async () => {
    const value = '<pre>    line 1\n\n    line 2</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\n\nline 2</pre>')
  })

  it('should not modify pre without trailing whitespace or indentation', async () => {
    const value = '<pre><code>clean</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>clean</code>')
  })

  it('should handle multiple pre blocks', async () => {
    const value = '<pre><code>first\n</code></pre><pre><code>second\n</code></pre>'
    const result = await transform(value)

    expect(result).toContain('<code>first</code>')
    expect(result).toContain('<code>second</code>')
  })

  it('should handle html with no pre blocks', async () => {
    const value = '<p>No code here</p>'
    const result = await transform(value)

    expect(result).toContain('<p>No code here</p>')
  })
})
