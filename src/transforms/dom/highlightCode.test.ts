import { describe, expect, it } from 'bun:test'
import { parseHTML } from 'linkedom'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { detectLanguage, highlightCode } from './highlightCode.js'

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

  it('should detect Pandoc sourceCode language', () => {
    const { pre, code } = createElement(
      '<pre class="sourceCode haskell"><code class="sourceCode haskell">x</code></pre>',
    )

    expect(detectLanguage(pre, code)).toBe('haskell')
  })

  it('should ignore Pandoc structural classes when reading sourceCode language', () => {
    const { pre, code } = createElement(
      '<pre><code class="sourceCode numberLines python">x</code></pre>',
    )

    expect(detectLanguage(pre, code)).toBe('python')
  })

  it('should not detect a language from a sourceCode class with no language token', () => {
    const { pre, code } = createElement('<pre><code class="sourceCode numberLines">x</code></pre>')

    expect(detectLanguage(pre, code)).toBeUndefined()
  })

  it('should detect SyntaxHighlighter brush language', () => {
    const { pre, code } = createElement(
      '<pre class="brush: php; gutter: false"><code>x</code></pre>',
    )

    expect(detectLanguage(pre, code)).toBe('php')
  })

  it('should detect Crayon lang: language', () => {
    const { pre, code } = createElement('<pre class="lang:ruby decode:true"><code>x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('ruby')
  })

  it('should detect Crayon lang_ language', () => {
    const { pre, code } = createElement('<pre class="lang_scala"><code>x</code></pre>')

    expect(detectLanguage(pre, code)).toBe('scala')
  })

  it('should prefer language-* class over Pandoc sourceCode', () => {
    const { pre, code } = createElement(
      '<pre><code class="sourceCode python language-js">x</code></pre>',
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

describeForEachParser('highlightCode', (parseHtml) => {
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

  it('should auto-detect and highlight an unlabeled code block', async () => {
    const value = '<pre><code>function greet(name) {\n  return "Hello, " + name;\n}</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs')
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

  it('should fall back to auto-detection when the declared language is unknown', async () => {
    const value =
      '<pre><code class="language-nonexistent">function add(a, b) {\n  return a + b;\n}</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs')
  })

  it('should leave a lang-auto block as plain text', async () => {
    const value = '<pre><code class="lang-auto">System: Host: laptop arch: x86_64</code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should auto-detect HTML in an unlabeled block', async () => {
    const value =
      '<pre><code>&lt;div class="card"&gt;&lt;span&gt;hi&lt;/span&gt;&lt;/div&gt;</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs')
  })

  it('should highlight a CSS block that has braces', async () => {
    const value = '<pre><code>.btn { color: red; padding: 4px; }</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs')
  })

  it('should not highlight prose that loosely resembles code', async () => {
    const value = '<pre><code>Note: this matters; really, it does. See also: the docs.</code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should not highlight key-value output that resembles YAML', async () => {
    const value = '<pre><code>Status: ok\nName: test\nValue: 42</code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should not highlight a CSS-looking sentence without braces', async () => {
    const value = '<pre><code>color: the role it plays; size: how big it feels.</code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should not highlight a trivial one-liner below the relevance floor', async () => {
    const value = '<pre><code>const x = 1</code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should highlight registered aliases', async () => {
    const aliases = [
      '<pre><code class="language-markup"><div>hi</div></code></pre>',
      '<pre><code class="language-mysql">SELECT 1</code></pre>',
      '<pre><code class="language-python3">def f():\n    return 1</code></pre>',
      '<pre><code class="language-objective-c">int x = 1;</code></pre>',
      '<pre><code class="language-shell-session">$ ls -la</code></pre>',
      '<pre><code class="language-emacs-lisp">(defun foo () 1)</code></pre>',
      '<pre><code class="language-clike">int x = 1;</code></pre>',
      '<pre><code class="language-racket">(define x 1)</code></pre>',
      '<pre><code class="language-jsonc">{"a": 1}</code></pre>',
      '<pre><code class="language-vb">Dim x = 1</code></pre>',
      '<pre><code class="language-fish">echo hi</code></pre>',
      '<pre><code class="language-psql">SELECT 1</code></pre>',
      '<pre><code class="language-asm">mov eax, 1</code></pre>',
      '<pre><code class="language-arduino">void setup() {}</code></pre>',
    ]

    for (const value of aliases) {
      expect(await transform(value)).toContain('hljs')
    }
  })

  it('should highlight a bare pre (no code child) with a data-language hint', async () => {
    const value = [
      '<pre data-language="bash">curl -X POST https://api.example.com/posts \\',
      '  -H "Authorization: Bearer TOKEN" \\',
      `  -d '{"title":"hi"}'</pre>`,
    ].join('\n')
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('<span class="hljs-')
  })

  it('should highlight a bare pre with a language-* class', async () => {
    const value = '<pre class="language-js">const x = 1</pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('class="language-js hljs"')
  })

  it('should not highlight a bare pre without a language hint', async () => {
    const value = '<pre>plain preformatted text</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('plain preformatted text')
  })

  it('should not auto-detect a bare pre: unlabeled code stays plain', async () => {
    const value = '<pre>function greet(name) {\n  return "Hello, " + name;\n}</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should not highlight a bare pre with an unsupported language hint', async () => {
    const value = '<pre data-language="nonexistent">some content here</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
  })

  it('should be idempotent on a bare pre', async () => {
    const value = '<pre class="language-js">const x = 1</pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
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

  it('should highlight a registered extra language (haskell)', async () => {
    const value = '<pre><code class="language-haskell">main = putStrLn "hello"</code></pre>'
    const result = await transform(value)

    expect(result).toContain('class="language-haskell hljs"')
    expect(result).toContain('<span class="hljs-')
  })

  it('should highlight Pandoc sourceCode blocks', async () => {
    const value =
      '<pre class="sourceCode python"><code class="sourceCode python">def f():\n    return 1</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
  })

  it('should be idempotent', async () => {
    const value = '<pre><code class="language-js">const x = 1</code></pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
