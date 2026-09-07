import { describe, expect, it } from 'bun:test'
import { parseHTML } from 'linkedom'
import { parseHtml } from '../../parsers/linkedom.js'
import { baseContext, describeForEachParser, queryElement } from '../../tests.js'
import type { HighlightFn, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { detectLanguage, highlightCode } from './highlightCode.js'

describe('detectLanguage', () => {
  const createElement = (value: string): { pre: Element; code: Element | null } => {
    const { document } = parseHTML(`<!doctype html><html><body>${value}</body></html>`)
    const pre = queryElement(document, 'pre')
    const code = pre.querySelector('code')

    return { pre, code }
  }

  describe('language-* / lang-* class', () => {
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
  })

  describe('data-language / data-lang attributes', () => {
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
  })

  describe('EnlighterJS data-enlighter-language', () => {
    it('should detect language from data-enlighter-language', () => {
      const { pre, code } = createElement(
        '<pre class="EnlighterJSRAW" data-enlighter-language="ruby">x</pre>',
      )

      expect(detectLanguage(pre, code)).toBe('ruby')
    })

    it('should prefer data-language over data-enlighter-language', () => {
      const { pre, code } = createElement(
        '<pre data-language="js" data-enlighter-language="python">x</pre>',
      )

      expect(detectLanguage(pre, code)).toBe('js')
    })
  })

  describe('Pandoc sourceCode', () => {
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
      const { pre, code } = createElement(
        '<pre><code class="sourceCode numberLines">x</code></pre>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })
  })

  describe('SyntaxHighlighter Evolved brush', () => {
    it('should detect SyntaxHighlighter brush language', () => {
      const { pre, code } = createElement(
        '<pre class="brush: php; gutter: false"><code>x</code></pre>',
      )

      expect(detectLanguage(pre, code)).toBe('php')
    })
  })

  describe('Crayon', () => {
    it('should detect Crayon lang: language', () => {
      const { pre, code } = createElement('<pre class="lang:ruby decode:true"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBe('ruby')
    })

    it('should detect Crayon lang_ language', () => {
      const { pre, code } = createElement('<pre class="lang_scala"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBe('scala')
    })
  })

  describe('Rouge wrapping ancestor', () => {
    it('should detect language-* from the immediate parent wrapper', () => {
      const { pre, code } = createElement(
        '<div class="language-rb highlighter-rouge"><pre><code>x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBe('rb')
    })

    it('should detect lang-* from an ancestor wrapper', () => {
      const { pre, code } = createElement(
        '<div class="lang-go"><div><pre><code>x</code></pre></div></div>',
      )

      expect(detectLanguage(pre, code)).toBe('go')
    })

    it('should detect language-* two levels up (full Rouge nesting)', () => {
      const { pre, code } = createElement(
        '<div class="language-rb highlighter-rouge"><div class="highlight"><pre class="highlight"><code>x</code></pre></div></div>',
      )

      expect(detectLanguage(pre, code)).toBe('rb')
    })

    it('should not detect a language-* beyond the ancestor depth bound', () => {
      const { pre, code } = createElement(
        '<div class="language-rb"><div><div><div><pre><code>x</code></pre></div></div></div></div>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should prefer a class on code over an ancestor language-*', () => {
      const { pre, code } = createElement(
        '<div class="language-python highlighter-rouge"><pre><code class="language-js">x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBe('js')
    })

    it('should not detect a language from a wrapper marker class alone', () => {
      const { pre, code } = createElement(
        '<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>x</code></pre></div></div>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })
  })

  describe('Expressive Code figcaption', () => {
    it('should detect the language from a figcaption filename', () => {
      const { pre, code } = createElement(
        '<figure><figcaption><span>biome.json</span></figcaption><pre><code>x</code></pre></figure>',
      )

      expect(detectLanguage(pre, code)).toBe('json')
    })

    it('should read the last extension of a path in the figcaption', () => {
      const { pre, code } = createElement(
        '<figure><figcaption>.vscode/settings.json</figcaption><pre><code>x</code></pre></figure>',
      )

      expect(detectLanguage(pre, code)).toBe('json')
    })

    it('should ignore a figcaption that is not a filename', () => {
      const { pre, code } = createElement(
        '<figure><figcaption>See the configuration below</figcaption><pre><code>x</code></pre></figure>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should ignore an extensionless dotfile in the figcaption', () => {
      const { pre, code } = createElement(
        '<figure><figcaption>.gitignore</figcaption><pre><code>x</code></pre></figure>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should ignore an empty figcaption', () => {
      const { pre, code } = createElement(
        '<figure><figcaption></figcaption><pre><code>x</code></pre></figure>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should prefer an explicit class over a figcaption filename', () => {
      const { pre, code } = createElement(
        '<figure><figcaption>biome.json</figcaption><pre><code class="language-yaml">x</code></pre></figure>',
      )

      expect(detectLanguage(pre, code)).toBe('yaml')
    })
  })

  describe('Forem highlight class', () => {
    it('should detect a class="highlight LANG" language on the pre', () => {
      const { pre, code } = createElement('<pre class="highlight shell"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBe('shell')
    })

    it('should detect a class="highlight LANG" language on a wrapping div', () => {
      const { pre, code } = createElement(
        '<div class="highlight js"><pre><code>x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBe('js')
    })

    it('should ignore a highlight class whose sibling token is not a language', () => {
      const { pre, code } = createElement('<pre class="highlight selected"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should ignore a bare highlight class with no language token', () => {
      const { pre, code } = createElement('<pre class="highlight"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should prefer an explicit class over a highlight LANG token', () => {
      const { pre, code } = createElement(
        '<pre class="highlight shell"><code class="language-js">x</code></pre>',
      )

      expect(detectLanguage(pre, code)).toBe('js')
    })
  })

  describe('GitHub / Sphinx wrapper class', () => {
    it('should detect a GitHub highlight-source-LANG wrapper class', () => {
      const { pre, code } = createElement(
        '<div class="highlight highlight-source-ruby"><pre><code>x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBe('ruby')
    })

    it('should detect a GitHub highlight-text-LANG wrapper class', () => {
      const { pre, code } = createElement(
        '<div class="highlight highlight-text-html-basic"><pre><code>x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBe('html')
    })

    it('should keep a one-letter GitHub source language', () => {
      const { pre, code } = createElement(
        '<div class="highlight highlight-source-c"><pre><code>x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBe('c')
    })

    it('should detect a Sphinx highlight-LANG wrapper class', () => {
      const { pre, code } = createElement(
        '<div class="highlight-python notranslate"><div class="highlight"><pre><code>x</code></pre></div></div>',
      )

      expect(detectLanguage(pre, code)).toBe('python')
    })

    it('should ignore a one-letter Sphinx highlight-LANG to avoid CSS collisions', () => {
      const { pre, code } = createElement(
        '<div class="highlight-c"><pre><code>x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should ignore a highlight-LANG whose token is not a language', () => {
      const { pre, code } = createElement(
        '<div class="highlight-line"><pre><code>x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should prefer an explicit class over a highlight-source-LANG wrapper', () => {
      const { pre, code } = createElement(
        '<div class="highlight highlight-source-ruby"><pre><code class="language-js">x</code></pre></div>',
      )

      expect(detectLanguage(pre, code)).toBe('js')
    })
  })

  describe('bare language-name class', () => {
    it('should detect a standalone language-name class on pre', () => {
      const { pre, code } = createElement('<pre class="haskell">x</pre>')

      expect(detectLanguage(pre, code)).toBe('haskell')
    })

    it('should detect a standalone language-name class on code', () => {
      const { pre, code } = createElement('<pre><code class="python">x</code></pre>')

      expect(detectLanguage(pre, code)).toBe('python')
    })

    it('should detect a language-name token among other classes', () => {
      const { pre, code } = createElement('<pre class="foo bar rust"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBe('rust')
    })

    it('should ignore a two-letter alias that collides with CSS classes', () => {
      const { pre, code } = createElement('<pre class="md"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should ignore a one-letter language class', () => {
      const { pre, code } = createElement('<pre class="c"><code>x</code></pre>')

      expect(detectLanguage(pre, code)).toBeUndefined()
    })

    it('should prefer an explicit language-* class over a bare language-name class', () => {
      const { pre, code } = createElement(
        '<pre class="haskell"><code class="language-js">x</code></pre>',
      )

      expect(detectLanguage(pre, code)).toBe('js')
    })
  })

  describe('precedence between styles', () => {
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

    it('should prefer language-* class over Pandoc sourceCode', () => {
      const { pre, code } = createElement(
        '<pre><code class="sourceCode python language-js">x</code></pre>',
      )

      expect(detectLanguage(pre, code)).toBe('js')
    })
  })

  describe('no usable hint', () => {
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
})

// Highlighted output is compared with `toEqualHtml` wherever the transform adds the data-pre-*
// attributes: linkedom writes them before the pre's existing attributes and jsdom after, so only
// the attribute order differs. Blocks the transform leaves plain serialise identically under both
// parsers and are compared with `toBe`.
describeForEachParser('highlightCode', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [highlightCode(context)])
  }

  describe('line-number gutters', () => {
    it('should drop a Rouge table gutter and highlight only the code', async () => {
      const value =
        '<figure class="highlight"><table class="rouge-table"><tbody><tr><td class="gutter"><pre class="lineno">1\n2</pre></td><td class="code"><pre><code class="language-ruby">puts 1\nputs 2</code></pre></td></tr></tbody></table></figure>'
      const expected =
        '<figure class="highlight"><pre data-pre-language="ruby" data-pre-label="Ruby" data-pre-numbered=""><code class="language-ruby hljs">puts <span class="hljs-number">1</span>\nputs <span class="hljs-number">2</span></code></pre></figure>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not nest a pre when the gutter table is inside the block pre/code', async () => {
      const value =
        '<figure class="highlight"><pre><code class="language-ruby"><table><tbody><tr><td class="gutter"><pre class="lineno">1\n2</pre></td><td class="code"><pre>puts 1\nputs 2</pre></td></tr></tbody></table></code></pre></figure>'
      const expected =
        '<figure class="highlight"><pre data-pre-language="ruby" data-pre-label="Ruby" data-pre-numbered=""><code class="language-ruby hljs">puts <span class="hljs-number">1</span>\nputs <span class="hljs-number">2</span></code></pre></figure>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the code column language when the wrapper declares none', async () => {
      const value =
        '<figure class="highlight"><pre><code><table><tbody><tr><td class="gutter"><pre class="lineno">1\n2</pre></td><td class="code"><pre><code class="language-ruby">puts 1\nputs 2</code></pre></td></tr></tbody></table></code></pre></figure>'
      const expected =
        '<figure class="highlight"><pre data-pre-language="ruby" data-pre-label="Ruby" data-pre-numbered=""><code class="language-ruby hljs">puts <span class="hljs-number">1</span>\nputs <span class="hljs-number">2</span></code></pre></figure>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop a Pygments highlighttable gutter', async () => {
      const value =
        '<table class="highlighttable"><tbody><tr><td class="linenos"><pre>1</pre></td><td class="code"><pre><code class="language-python">x = 1</code></pre></td></tr></tbody></table>'
      const expected =
        '<pre data-pre-language="python" data-pre-label="Python" data-pre-numbered=""><code class="language-python hljs">x = <span class="hljs-number">1</span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove inline per-line number spans (Chroma .ln)', async () => {
      const value =
        '<pre class="chroma"><code><span class="line"><span class="ln">1</span><span class="cl">echo hi</span></span></code></pre>'
      const expected =
        '<pre class="chroma" data-pre-numbered=""><code><span class="line"><span class="cl">echo hi</span></span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove inline per-line number spans (Pygments .lineno)', async () => {
      const value =
        '<pre><span class="lineno">1</span>echo hi\n<span class="lineno">2</span>echo bye</pre>'
      const expected = '<pre data-pre-numbered=""><code>echo hi\necho bye</code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an orphan gutter span outside any code block untouched', async () => {
      const value = '<p><span class="ln">1</span>text</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should drop a gutter table with no recognized class (structural)', async () => {
      const value =
        '<table><tbody><tr><td><pre>1\n2</pre></td><td><pre><code class="language-js">const a = 1\nconst b = 2</code></pre></td></tr></tbody></table>'
      const expected =
        '<pre data-pre-language="js" data-pre-label="JavaScript" data-pre-numbered=""><code class="language-js hljs"><span class="hljs-keyword">const</span> a = <span class="hljs-number">1</span>\n<span class="hljs-keyword">const</span> b = <span class="hljs-number">2</span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a real data table untouched', async () => {
      const value =
        '<table><tbody><tr><td>1</td><td>Apple</td></tr><tr><td>2</td><td>Banana</td></tr></tbody></table>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not mark a plain code block without a gutter', async () => {
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const expected =
        '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  it('should highlight code block with language-js class', async () => {
    const value = '<pre><code class="language-js">const x = 1</code></pre>'
    const expected =
      '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should highlight code block with lang-python class', async () => {
    const value = '<pre><code class="lang-python">def hello():\n    print("hi")</code></pre>'
    const expected =
      '<pre data-pre-language="python" data-pre-label="Python"><code class="lang-python hljs"><span class="hljs-keyword">def</span> <span class="hljs-title function_">hello</span>():\n    <span class="hljs-built_in">print</span>(<span class="hljs-string">"hi"</span>)</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave an unlabeled non-JSON block plain', async () => {
    const value = '<pre><code>function greet(name) {\n  return "Hello, " + name;\n}</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep line breaks when each line is wrapped in a block element', async () => {
    const value =
      '<pre><code class="language-js"><div>const x = 1;</div><div>const y = 2;</div></code></pre>'
    const expected =
      '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>;\n<span class="hljs-keyword">const</span> y = <span class="hljs-number">2</span>;</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should collapse nested block wrappers to a single line break', async () => {
    const value =
      '<pre><code class="language-js"><div><div>const x = 1;</div></div><div><div>const y = 2;</div></div></code></pre>'
    const expected =
      '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>;\n<span class="hljs-keyword">const</span> y = <span class="hljs-number">2</span>;</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should promote a block-wrapped standalone code element to a highlighted block', async () => {
    const value = '<code class="language-js"><div>const x = 1;</div><div>const y = 2;</div></code>'
    const expected =
      '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>;\n<span class="hljs-keyword">const</span> y = <span class="hljs-number">2</span>;</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not touch inline code outside pre', async () => {
    const value = '<p>Use <code>const x = 1</code> to declare a variable</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not touch empty code blocks', async () => {
    const value = '<pre><code></code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not touch whitespace-only code blocks', async () => {
    const value = '<pre><code>   \n  </code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a block with an unknown declared language plain', async () => {
    const value =
      '<pre><code class="language-nonexistent">function add(a, b) {\n  return a + b;\n}</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a lang-auto block as plain text', async () => {
    const value = '<pre><code class="lang-auto">System: Host: laptop arch: x86_64</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave an unlabeled JSON block plain', async () => {
    const value = '<pre><code>{\n  "linter": true,\n  "rules": ["a", "b"]\n}</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a trivial unlabeled one-liner plain', async () => {
    const value = '<pre><code>const x = 1</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  // Each row states only that the alias resolves to a registered language: the highlighted
  // markup of fourteen languages would bury the alias, which is the whole point of the table.
  const aliasFixtures: Array<[string, string]> = [
    ['markup', '<pre><code class="language-markup"><div>hi</div></code></pre>'],
    ['mysql', '<pre><code class="language-mysql">SELECT 1</code></pre>'],
    ['python3', '<pre><code class="language-python3">def f():\n    return 1</code></pre>'],
    ['objective-c', '<pre><code class="language-objective-c">int x = 1;</code></pre>'],
    ['shell-session', '<pre><code class="language-shell-session">$ ls -la</code></pre>'],
    ['emacs-lisp', '<pre><code class="language-emacs-lisp">(defun foo () 1)</code></pre>'],
    ['clike', '<pre><code class="language-clike">int x = 1;</code></pre>'],
    ['racket', '<pre><code class="language-racket">(define x 1)</code></pre>'],
    ['jsonc', '<pre><code class="language-jsonc">{"a": 1}</code></pre>'],
    ['vb', '<pre><code class="language-vb">Dim x = 1</code></pre>'],
    ['fish', '<pre><code class="language-fish">echo hi</code></pre>'],
    ['psql', '<pre><code class="language-psql">SELECT 1</code></pre>'],
    ['asm', '<pre><code class="language-asm">mov eax, 1</code></pre>'],
    ['arduino', '<pre><code class="language-arduino">void setup() {}</code></pre>'],
  ]

  it.each(aliasFixtures)('should highlight registered alias %s', async (_alias, value) => {
    expect(await transform(value)).toContain('hljs')
  })

  it('should highlight a bare pre (no code child) with a data-language hint', async () => {
    const value = [
      '<pre data-language="bash">curl -X POST https://api.example.com/posts \\',
      '  -H "Authorization: Bearer TOKEN" \\',
      `  -d '{"title":"hi"}'</pre>`,
    ].join('\n')
    const expected = [
      '<pre data-language="bash" data-pre-language="bash" data-pre-label="Bash"><code class="hljs">curl -X POST https://api.example.com/posts \\',
      '  -H <span class="hljs-string">"Authorization: Bearer TOKEN"</span> \\',
      `  -d <span class="hljs-string">'{"title":"hi"}'</span></code></pre>`,
    ].join('\n')

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should highlight a bare pre with a language-* class', async () => {
    const value = '<pre class="language-js">const x = 1</pre>'
    const expected =
      '<pre class="language-js" data-pre-language="js" data-pre-label="JavaScript"><code class="hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not highlight a bare pre without a language hint', async () => {
    const value = '<pre>plain preformatted text</pre>'
    const expected = '<pre><code>plain preformatted text</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave an unlabeled bare pre plain', async () => {
    const value = '<pre>function greet(name) {\n  return "Hello, " + name;\n}</pre>'
    const expected = '<pre><code>function greet(name) {\n  return "Hello, " + name;\n}</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not highlight a bare pre with an unsupported language hint', async () => {
    const value = '<pre data-language="nonexistent">some content here</pre>'
    const expected = '<pre data-language="nonexistent"><code>some content here</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent on a bare pre', async () => {
    const value = '<pre class="language-js">const x = 1</pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  it('should highlight a standalone multi-line code (no pre) with a data-language hint', async () => {
    const value = [
      '<div><code data-language="bash">curl -X POST https://api.example.com/posts \\',
      '  -H "Authorization: Bearer TOKEN"</code></div>',
    ].join('\n')
    const expected = [
      '<div><pre data-pre-language="bash" data-pre-label="Bash"><code data-language="bash" class="hljs">curl -X POST https://api.example.com/posts \\',
      '  -H <span class="hljs-string">"Authorization: Bearer TOKEN"</span></code></pre></div>',
    ].join('\n')

    expect(await transform(value)).toEqualHtml(expected)
  })

  // The expected value states the `<pre>` wrapper too, so this also pins that a highlighted
  // standalone `<code>` gets promoted rather than left bare.
  it('should highlight a standalone multi-line code with a language-* class', async () => {
    const value = '<code class="language-python">def hello():\n    print("hi")</code>'
    const expected =
      '<pre data-pre-language="python" data-pre-label="Python"><code class="language-python hljs"><span class="hljs-keyword">def</span> <span class="hljs-title function_">hello</span>():\n    <span class="hljs-built_in">print</span>(<span class="hljs-string">"hi"</span>)</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not highlight a hinted single-line inline code', async () => {
    const value = '<p>Use <code class="language-js">const x = 1</code> to declare</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should promote an unhinted multi-line standalone code even without highlighting', async () => {
    const value = '<code>the quick brown fox\njumps over the lazy dog</code>'
    const expected = '<pre><code>the quick brown fox\njumps over the lazy dog</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not promote a single-line standalone code', async () => {
    const value = '<p>see <code>config.set("x", 1)</code> here</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not promote a pretty-printed single-word inline code', async () => {
    const value = '<p>I used <code>\n  mdp\n </code> for slides</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not promote a single content line padded with blank lines', async () => {
    const value = '<p>run <code>\n\n\n  npm install\n </code> first</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent on a standalone code', async () => {
    const value = '<code class="language-python">def hello():\n    print("hi")</code>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  it('should handle html with no code blocks', async () => {
    const value = '<p>No code here</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should highlight Shiki code blocks using data-language on pre', async () => {
    const value = [
      '<pre class="astro-code" data-language="scss">',
      '<code><span class="line"><span>header</span><span> {</span></span>\n',
      '<span class="line"><span>  ul</span><span> {</span></span></code>',
      '</pre>',
    ].join('')
    const expected =
      '<pre class="astro-code" data-language="scss" data-pre-language="scss" data-pre-label="SCSS"><code class="hljs"><span class="hljs-selector-tag">header</span> {\n  <span class="hljs-selector-tag">ul</span> {</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should highlight multiple code blocks', async () => {
    const value = [
      '<pre><code class="language-js">const a = 1</code></pre>',
      '<pre><code class="language-python">x = 1</code></pre>',
    ].join('')
    const expected =
      '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="hljs-keyword">const</span> a = <span class="hljs-number">1</span></code></pre><pre data-pre-language="python" data-pre-label="Python"><code class="language-python hljs">x = <span class="hljs-number">1</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should highlight a registered extra language (haskell)', async () => {
    const value = '<pre><code class="language-haskell">main = putStrLn "hello"</code></pre>'
    const expected =
      '<pre data-pre-language="haskell" data-pre-label="Haskell"><code class="language-haskell hljs"><span class="hljs-title">main</span> = putStrLn <span class="hljs-string">"hello"</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should highlight Pandoc sourceCode blocks', async () => {
    const value =
      '<pre class="sourceCode python"><code class="sourceCode python">def f():\n    return 1</code></pre>'
    const expected =
      '<pre class="sourceCode python" data-pre-language="python" data-pre-label="Python"><code class="sourceCode python hljs"><span class="hljs-keyword">def</span> <span class="hljs-title function_">f</span>():\n    <span class="hljs-keyword">return</span> <span class="hljs-number">1</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should highlight a Jekyll/Rouge block via the language class on the wrapper', async () => {
    const value =
      '<div class="language-rb highlighter-rouge"><div class="highlight"><pre class="highlight"><code>def hello\n  puts "hi"\nend</code></pre></div></div>'
    const expected =
      '<div class="language-rb highlighter-rouge"><div class="highlight"><pre class="highlight" data-pre-language="rb" data-pre-label="Ruby"><code class="hljs"><span class="hljs-keyword">def</span> <span class="hljs-title function_">hello</span>\n  puts <span class="hljs-string">"hi"</span>\n<span class="hljs-keyword">end</span></code></pre></div></div>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent on a Jekyll/Rouge block', async () => {
    const value =
      '<div class="language-rb highlighter-rouge"><div class="highlight"><pre class="highlight"><code>def hello\n  puts "hi"\nend</code></pre></div></div>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  it('should highlight an Expressive Code block via its figcaption filename', async () => {
    const value =
      '<figure><figcaption><span>biome.json</span></figcaption><pre><code>{\n  "linter": true\n}</code></pre></figure>'
    const expected =
      '<figure><figcaption><span>biome.json</span></figcaption><pre data-pre-language="json" data-pre-label="JSON"><code class="hljs"><span class="hljs-punctuation">{</span>\n  <span class="hljs-attr">"linter"</span><span class="hljs-punctuation">:</span> <span class="hljs-literal"><span class="hljs-keyword">true</span></span>\n<span class="hljs-punctuation">}</span></code></pre></figure>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent on an Expressive Code block', async () => {
    const value =
      '<figure><figcaption><span>biome.json</span></figcaption><pre><code>{\n  "linter": true\n}</code></pre></figure>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  it('should highlight an EnlighterJS bare pre via data-enlighter-language', async () => {
    const value =
      '<pre class="EnlighterJSRAW" data-enlighter-language="python">def f():\n    return 1</pre>'
    const expected =
      '<pre class="EnlighterJSRAW" data-enlighter-language="python" data-pre-language="python" data-pre-label="Python"><code class="hljs"><span class="hljs-keyword">def</span> <span class="hljs-title function_">f</span>():\n    <span class="hljs-keyword">return</span> <span class="hljs-number">1</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave an EnlighterJS "generic" block as plain text', async () => {
    const value =
      '<pre class="EnlighterJSRAW" data-enlighter-language="generic">some plain text here</pre>'
    const expected =
      '<pre class="EnlighterJSRAW" data-enlighter-language="generic"><code>some plain text here</code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should highlight a Forem class="highlight LANG" block', async () => {
    const value = '<pre class="highlight ruby"><code>def hello\n  puts "hi"\nend</code></pre>'
    const expected =
      '<pre class="highlight ruby" data-pre-language="ruby" data-pre-label="Ruby"><code class="hljs"><span class="hljs-keyword">def</span> <span class="hljs-title function_">hello</span>\n  puts <span class="hljs-string">"hi"</span>\n<span class="hljs-keyword">end</span></code></pre>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent on a Forem class="highlight LANG" block', async () => {
    const value = '<pre class="highlight ruby"><code>def hello\n  puts "hi"\nend</code></pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  it('should highlight a GitHub highlight-source-LANG block', async () => {
    const value =
      '<div class="highlight highlight-source-ruby"><pre><code>def hello\n  puts "hi"\nend</code></pre></div>'
    const expected =
      '<div class="highlight highlight-source-ruby"><pre data-pre-language="ruby" data-pre-label="Ruby"><code class="hljs"><span class="hljs-keyword">def</span> <span class="hljs-title function_">hello</span>\n  puts <span class="hljs-string">"hi"</span>\n<span class="hljs-keyword">end</span></code></pre></div>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent on a GitHub highlight-source-LANG block', async () => {
    const value =
      '<div class="highlight highlight-source-ruby"><pre><code>def hello\n  puts "hi"\nend</code></pre></div>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  it('should be idempotent', async () => {
    const value = '<pre><code class="language-js">const x = 1</code></pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })

  describe('language attributes', () => {
    it('should expose a declared language on the pre as data-pre-* attributes', async () => {
      const value = '<pre data-language="bash">npm install my-package</pre>'
      const expected =
        '<pre data-language="bash" data-pre-language="bash" data-pre-label="Bash"><code class="hljs">npm install my-package</code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should resolve the label from a language-* class on the code', async () => {
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const expected =
        '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should label from the highlight.js display name', async () => {
      const value = '<pre><code class="language-crystal">puts "hi"</code></pre>'
      const expected =
        '<pre data-pre-language="crystal" data-pre-label="Crystal"><code class="language-crystal hljs">puts <span class="hljs-string">"hi"</span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should override messy highlight.js names', async () => {
      const value = '<pre data-language="php">echo 1;</pre>'
      const expected =
        '<pre data-language="php" data-pre-language="php" data-pre-label="PHP"><code class="hljs"><span class="hljs-keyword">echo</span> <span class="hljs-number">1</span>;</code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not add data-pre-* attributes to a block left unhighlighted', async () => {
      const value =
        '<pre><code>Note: this matters; really, it does. See also: the docs.</code></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a block declared as plain text unlabeled', async () => {
      const value = '<pre><code class="language-text">just some plain text</code></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('custom highlightFn', () => {
    it('should use a custom highlightFn from the context instead of hljs', async () => {
      const highlightFn: HighlightFn = (text, language) =>
        `<span class="custom-${language}">${text}</span>`
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const expected =
        '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><span class="custom-js">const x = 1</span></code></pre>'

      expect(await transform(value, { ...baseContext, highlightFn })).toEqualHtml(expected)
    })

    it('should leave a block plain when the custom highlightFn returns undefined', async () => {
      const highlightFn: HighlightFn = () => undefined
      const value = '<pre><code class="language-js">const x = 1</code></pre>'

      expect(await transform(value, { ...baseContext, highlightFn })).toEqualHtml(value)
    })

    it('should support an async highlightFn', async () => {
      const highlightFn: HighlightFn = async (text) => `<i>${text}</i>`
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const expected =
        '<pre data-pre-language="js" data-pre-label="JavaScript"><code class="language-js hljs"><i>const x = 1</i></code></pre>'

      expect(await transform(value, { ...baseContext, highlightFn })).toEqualHtml(expected)
    })
  })

  describe('pre>code structure', () => {
    it('should wrap a bare pre content in a code', async () => {
      const value = '<pre>plain preformatted text</pre>'
      const expected = '<pre><code>plain preformatted text</code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a pre whose only child is a code unchanged', async () => {
      const value = '<pre><code>plain text</code></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    // The existing <code> is left in place (stripEmptyTags drops the empty span later); the
    // point is that it is not wrapped in a second <code>.
    it('should not nest the code when a Pygments empty span precedes it', async () => {
      const value = '<pre><span></span><code>plain text</code></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not nest the code when it is buried under wrapper divs', async () => {
      const value = '<pre><div class="hl"><code>plain text</code></div></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should wrap a pre with no code child, keeping empty line spans', async () => {
      const value = '<pre><span class="line"></span><br><span class="line">x = 1</span></pre>'
      const expected =
        '<pre><code><span class="line"></span><br><span class="line">x = 1</span></code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should move the in-place hljs class onto the new code', async () => {
      const value = '<pre data-language="bash">npm i</pre>'
      const expected =
        '<pre data-language="bash" data-pre-language="bash" data-pre-label="Bash"><code class="hljs">npm i</code></pre>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })
})

// linkedom only: jsdom's serializer is itself superlinear in nesting depth, so it
// can't round-trip a document this deep regardless of the transform.
describe('highlightCode with deep nesting', () => {
  // The only case in this file with no stateable output: 40000 nested spans highlighted into
  // hundreds of kilobytes of markup, where the assertion is that the pass ran at all.
  it('should not overflow the stack on a deeply nested code block', async () => {
    const value = `<pre><code class="language-javascript">${'<span>'.repeat(40000)}const x = 1${'</span>'.repeat(40000)}</code></pre>`
    const result = await applyDomTransforms(parseHtml(value), [highlightCode(baseContext)])

    expect(result).toContain('hljs')
  })
})
