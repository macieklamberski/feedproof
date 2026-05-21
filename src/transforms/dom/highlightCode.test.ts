import { describe, expect, it } from 'bun:test'
import { parseHTML } from 'linkedom'
import { applyDomTransforms } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import { parseHtml } from '../../parsers/linkedom.js'
import type { TransformContext } from '../../types.js'
import { detectLanguage, highlightCode } from './highlightCode.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('detectLanguage', () => {
  const createElement = (html: string): { pre: Element; code: Element | null } => {
    const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`)
    const pre = document.querySelector('pre') as Element
    const code = pre.querySelector('code')

    return { pre, code }
  }

  it('should detect language from language-* class on code', () => {
    const { pre, code } = createElement('<pre><code class="language-js">x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('js')
  })

  it('should detect language from lang-* class on code', () => {
    const { pre, code } = createElement('<pre><code class="lang-python">x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('python')
  })

  it('should detect language from language-* class on pre', () => {
    const { pre, code } = createElement('<pre class="language-css"><code>x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('css')
  })

  it('should detect language from lang-* class on pre', () => {
    const { pre, code } = createElement('<pre class="lang-ruby"><code>x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('ruby')
  })

  it('should detect language from data-language on pre', () => {
    const { pre, code } = createElement('<pre data-language="scss"><code>x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('scss')
  })

  it('should detect language from data-language on code', () => {
    const { pre, code } = createElement('<pre><code data-language="go">x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('go')
  })

  it('should detect language from data-lang on pre', () => {
    const { pre, code } = createElement('<pre data-lang="rust"><code>x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('rust')
  })

  it('should detect language from data-lang on code', () => {
    const { pre, code } = createElement('<pre><code data-lang="swift">x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('swift')
  })

  it('should prefer class on code over class on pre', () => {
    const { pre, code } = createElement(
      '<pre class="language-python"><code class="language-js">x</code></pre>',
    )

    expect(detectLanguage(pre, code)).toBe('js')
  })

  it('should prefer class on code over data-language on pre', () => {
    const { pre, code } = createElement(
      '<pre data-language="python"><code class="language-js">x</code></pre>',
    )

    expect(detectLanguage(pre, code)).toBe('js')
  })

  it('should prefer class on pre over data-language on pre', () => {
    const { pre, code } = createElement(
      '<pre class="language-js" data-language="python"><code>x</code></pre>',
    )

    expect(detectLanguage(pre, code)).toBe('js')
  })

  it('should prefer data-language over data-lang on same element', () => {
    const { pre, code } = createElement(
      '<pre data-language="js" data-lang="python"><code>x</code></pre>',
    )

    expect(detectLanguage(pre, code)).toBe('js')
  })

  it('should return undefined when no language hint is present', () => {
    const { pre, code } = createElement('<pre><code>x</code></pre>')

    expect(detectLanguage(pre, code)).toBeUndefined()
  })

  it('should handle null code element', () => {
    const { pre } = createElement('<pre class="language-js"><code>x</code></pre>')

    expect(detectLanguage(pre, null)).toBe('js')
  })

  it('should handle null code element with data-language', () => {
    const { pre } = createElement('<pre data-language="js"><code>x</code></pre>')

    expect(detectLanguage(pre, null)).toBe('js')
  })
})

describe('highlightCode', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [highlightCode(context)])
  }

  it('should highlight code block with language-js class', async () => {
    const value = '<pre><code class="language-js">const x = 1</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('hljs-number')
    expect(result).toContain('class="language-js hljs"')
  })

  it('should highlight code block with lang-python class', async () => {
    const value = '<pre><code class="lang-python">def hello():\n    print("hi")</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('class="lang-python hljs"')
  })

  it('should auto-detect language when no class is present', async () => {
    const value = '<pre><code>function greet(name) {\n  return "Hello, " + name;\n}</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('<span class="hljs-')
  })

  it('should not touch inline code outside pre', async () => {
    const value = '<p>Use <code>const x = 1</code> to declare a variable</p>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('<code>const x = 1</code>')
  })

  it('should not touch empty code blocks', async () => {
    const value = '<pre><code></code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should not touch whitespace-only code blocks', async () => {
    const value = '<pre><code>   \n  </code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should fall back to auto-detection for unsupported language', async () => {
    const value = '<pre><code class="language-nonexistent">const x = 1</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('<span class="hljs-')
  })

  it('should not modify pre without code element', async () => {
    const value = '<pre>plain preformatted text</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('plain preformatted text')
  })

  it('should handle html with no code blocks', async () => {
    const value = '<p>No code here</p>'
    const result = await transform(value)

    expect(result).toContain('<p>No code here</p>')
  })

  it('should highlight Shiki code blocks using data-language on pre', async () => {
    const value = [
      '<pre class="astro-code" data-language="scss">',
      '<code><span class="line"><span>header</span><span> {</span></span>\n',
      '<span class="line"><span>  ul</span><span> {</span></span></code>',
      '</pre>',
    ].join('')
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('<span class="hljs-')
  })

  it('should highlight multiple code blocks', async () => {
    const value = [
      '<pre><code class="language-js">const a = 1</code></pre>',
      '<pre><code class="language-python">x = 1</code></pre>',
    ].join('')
    const result = await transform(value)
    const matches = result.match(/class="[^"]*hljs"/g)

    expect(matches).toHaveLength(2)
  })
})
