import { describe, expect, it } from 'bun:test'
import { parseHTML } from 'linkedom'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, queryElement } from '../../tests.js'
import type { HighlightFn, TransformContext } from '../../types.js'
import { detectLanguage, highlightCode } from './highlightCode.js'

const lineBreakBeforeConstRegex = /;\s*\n\s*<span class="hljs-keyword">const/

describe('detectLanguage', () => {
  const createElement = (html: string): { pre: Element; code: Element | null } => {
    const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`)
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

describeForEachParser('highlightCode', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [highlightCode(context)])
  }

  describe('line-number gutters', () => {
    it('should drop a Rouge table gutter and highlight only the code', async () => {
      const value =
        '<figure class="highlight"><table class="rouge-table"><tbody><tr><td class="gutter"><pre class="lineno">1\n2</pre></td><td class="code"><pre><code class="language-ruby">puts 1\nputs 2</code></pre></td></tr></tbody></table></figure>'
      const result = await transform(value)

      expect(result).not.toContain('rouge-table')
      expect(result).not.toContain('class="gutter"')
      expect(result).not.toContain('class="lineno"')
      expect(result).toContain('data-pre-language="ruby"')
    })

    it('should drop a Pygments highlighttable gutter', async () => {
      const value =
        '<table class="highlighttable"><tbody><tr><td class="linenos"><pre>1</pre></td><td class="code"><pre><code class="language-python">x = 1</code></pre></td></tr></tbody></table>'
      const result = await transform(value)

      expect(result).not.toContain('highlighttable')
      expect(result).not.toContain('linenos')
    })

    it('should remove inline per-line number spans (Chroma .ln)', async () => {
      const value =
        '<pre class="chroma"><code><span class="line"><span class="ln">1</span><span class="cl">echo hi</span></span></code></pre>'
      const result = await transform(value)

      expect(result).not.toContain('class="ln"')
      expect(result).toContain('echo hi')
    })

    it('should remove inline per-line number spans (Pygments .lineno)', async () => {
      const value =
        '<pre><span class="lineno">1</span>echo hi\n<span class="lineno">2</span>echo bye</pre>'
      const result = await transform(value)

      expect(result).not.toContain('class="lineno"')
      expect(result).toContain('echo hi')
      expect(result).toContain('echo bye')
    })

    it('should drop a gutter table with no recognized class (structural)', async () => {
      const value =
        '<table><tbody><tr><td><pre>1\n2</pre></td><td><pre><code class="language-js">const a = 1\nconst b = 2</code></pre></td></tr></tbody></table>'
      const result = await transform(value)

      expect(result).not.toContain('<table')
      expect(result).toContain('data-pre-language')
      expect(result).toContain('const')
    })

    it('should leave a real data table untouched', async () => {
      const value =
        '<table><tbody><tr><td>1</td><td>Apple</td></tr><tr><td>2</td><td>Banana</td></tr></tbody></table>'
      const result = await transform(value)

      expect(result).toBe(value)
    })
  })

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

  it('should leave an unlabeled non-JSON block plain', async () => {
    const value = '<pre><code>function greet(name) {\n  return "Hello, " + name;\n}</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep line breaks when each line is wrapped in a block element', async () => {
    const value =
      '<pre><code class="language-js"><div>const x = 1;</div><div>const y = 2;</div></code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toMatch(lineBreakBeforeConstRegex)
  })

  it('should collapse nested block wrappers to a single line break', async () => {
    const value =
      '<pre><code class="language-js"><div><div>const x = 1;</div></div><div><div>const y = 2;</div></div></code></pre>'
    const result = await transform(value)

    expect(result).toMatch(lineBreakBeforeConstRegex)
    expect(result).not.toContain('\n\n')
  })

  it('should promote a block-wrapped standalone code element to a highlighted block', async () => {
    const value = '<code class="language-js"><div>const x = 1;</div><div>const y = 2;</div></code>'
    const result = await transform(value)

    expect(result).toContain('<pre')
    expect(result).toMatch(lineBreakBeforeConstRegex)
  })

  it('should not touch inline code outside pre', async () => {
    const value = '<p>Use <code>const x = 1</code> to declare a variable</p>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('<code>const x = 1</code>')
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

  it('should highlight an unlabeled JSON block as JSON', async () => {
    const value = '<pre><code>{\n  "linter": true,\n  "rules": ["a", "b"]\n}</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('data-pre-language="json"')
    expect(result).toContain('data-pre-label="JSON"')
    expect(result).not.toContain('data-pre-guessed')
  })

  it('should not force JSON on a JSON-shaped CSS rule body', async () => {
    const value = '<pre><code>{ color: red; padding: 4px; }</code></pre>'

    expect(await transform(value)).not.toContain('data-pre-language="json"')
  })

  it('should leave a JSONC block with comments plain (it fails JSON.parse)', async () => {
    const value = '<pre><code>{\n  // a comment\n  "linter": true\n}</code></pre>'

    // JSON.parse fails on the comment, so the deterministic JSON branch is skipped.
    // With no auto-detection fallback, the block stays plain.
    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent on an unlabeled JSON block', async () => {
    const value = '<pre><code>{\n  "linter": true,\n  "rules": ["a", "b"]\n}</code></pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should leave a trivial unlabeled one-liner plain', async () => {
    const value = '<pre><code>const x = 1</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

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
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('<span class="hljs-')
  })

  it('should highlight a bare pre with a language-* class', async () => {
    const value = '<pre class="language-js">const x = 1</pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    // The content is wrapped in a <code> and the hljs class moves onto it.
    expect(result).toContain('<code class="hljs">')
    expect(result).toContain('class="language-js"')
  })

  it('should not highlight a bare pre without a language hint', async () => {
    const value = '<pre>plain preformatted text</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('plain preformatted text')
  })

  it('should leave an unlabeled bare pre plain', async () => {
    const value = '<pre>function greet(name) {\n  return "Hello, " + name;\n}</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('function greet(name)')
  })

  it('should not highlight a bare pre with an unsupported language hint', async () => {
    const value = '<pre data-language="nonexistent">some content here</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('some content here')
  })

  it('should be idempotent on a bare pre', async () => {
    const value = '<pre class="language-js">const x = 1</pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should highlight a standalone multi-line code (no pre) with a data-language hint', async () => {
    const value = [
      '<div><code data-language="bash">curl -X POST https://api.example.com/posts \\',
      '  -H "Authorization: Bearer TOKEN"</code></div>',
    ].join('\n')
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('<span class="hljs-')
  })

  it('should highlight a standalone multi-line code with a language-* class', async () => {
    const value = '<code class="language-python">def hello():\n    print("hi")</code>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('class="language-python hljs"')
  })

  it('should not highlight a hinted single-line inline code', async () => {
    const value = '<p>Use <code class="language-js">const x = 1</code> to declare</p>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('<code class="language-js">const x = 1</code>')
  })

  it('should wrap a highlighted standalone code in a pre', async () => {
    const value = '<code class="language-python">def hello():\n    print("hi")</code>'
    const result = await transform(value)

    // The <pre> now carries data-pre-* language attributes, so assert the pieces.
    expect(result.startsWith('<pre')).toBe(true)
    expect(result).toContain('<code class="language-python hljs">')
  })

  it('should promote an unhinted multi-line standalone code even without highlighting', async () => {
    const value = '<code>the quick brown fox\njumps over the lazy dog</code>'
    const result = await transform(value)

    expect(result).toContain('<pre><code')
    expect(result).not.toContain('hljs')
  })

  it('should not promote a single-line standalone code', async () => {
    const value = '<p>see <code>config.set("x", 1)</code> here</p>'
    const result = await transform(value)

    expect(result).not.toContain('<pre>')
    expect(result).toContain('<code>config.set("x", 1)</code>')
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

    expect(twice).toBe(once)
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

    expect(await transform(value)).toContain('hljs-keyword')
  })

  it('should highlight a Jekyll/Rouge block via the language class on the wrapper', async () => {
    const value = `<div class="language-rb highlighter-rouge"><div class="highlight"><pre class="highlight"><code>def hello\n  puts "hi"\nend</code></pre></div></div>`
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('data-pre-language="rb"')
    expect(result).toContain('data-pre-label="Ruby"')
    expect(result).not.toContain('data-pre-guessed')
  })

  it('should be idempotent on a Jekyll/Rouge block', async () => {
    const value = `<div class="language-rb highlighter-rouge"><div class="highlight"><pre class="highlight"><code>def hello\n  puts "hi"\nend</code></pre></div></div>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should highlight an Expressive Code block via its figcaption filename', async () => {
    const value =
      '<figure><figcaption><span>biome.json</span></figcaption><pre><code>{\n  "linter": true\n}</code></pre></figure>'
    const result = await transform(value)

    expect(result).toContain('hljs')
    expect(result).toContain('data-pre-language="json"')
    expect(result).toContain('data-pre-label="JSON"')
    expect(result).not.toContain('data-pre-guessed')
  })

  it('should be idempotent on an Expressive Code block', async () => {
    const value =
      '<figure><figcaption><span>biome.json</span></figcaption><pre><code>{\n  "linter": true\n}</code></pre></figure>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should highlight an EnlighterJS bare pre via data-enlighter-language', async () => {
    const value =
      '<pre class="EnlighterJSRAW" data-enlighter-language="python">def f():\n    return 1</pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('data-pre-language="python"')
    expect(result).toContain('data-pre-label="Python"')
    expect(result).not.toContain('data-pre-guessed')
  })

  it('should leave an EnlighterJS "generic" block as plain text', async () => {
    const value =
      '<pre class="EnlighterJSRAW" data-enlighter-language="generic">some plain text here</pre>'
    const result = await transform(value)

    expect(result).not.toContain('hljs')
    expect(result).toContain('some plain text here')
  })

  it('should highlight a Forem class="highlight LANG" block', async () => {
    const value = '<pre class="highlight ruby"><code>def hello\n  puts "hi"\nend</code></pre>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('data-pre-language="ruby"')
    expect(result).toContain('data-pre-label="Ruby"')
    expect(result).not.toContain('data-pre-guessed')
  })

  it('should be idempotent on a Forem class="highlight LANG" block', async () => {
    const value = '<pre class="highlight ruby"><code>def hello\n  puts "hi"\nend</code></pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should highlight a GitHub highlight-source-LANG block', async () => {
    const value =
      '<div class="highlight highlight-source-ruby"><pre><code>def hello\n  puts "hi"\nend</code></pre></div>'
    const result = await transform(value)

    expect(result).toContain('hljs-keyword')
    expect(result).toContain('data-pre-language="ruby"')
    expect(result).toContain('data-pre-label="Ruby"')
    expect(result).not.toContain('data-pre-guessed')
  })

  it('should be idempotent on a GitHub highlight-source-LANG block', async () => {
    const value =
      '<div class="highlight highlight-source-ruby"><pre><code>def hello\n  puts "hi"\nend</code></pre></div>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should be idempotent', async () => {
    const value = '<pre><code class="language-js">const x = 1</code></pre>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  describe('language attributes', () => {
    it('should expose a declared language on the pre as data-pre-* attributes', async () => {
      const value = '<pre data-language="bash">npm install my-package</pre>'
      const result = await transform(value)

      expect(result).toContain('data-pre-language="bash"')
      expect(result).toContain('data-pre-label="Bash"')
      expect(result).not.toContain('data-pre-guessed')
    })

    it('should resolve the label from a language-* class on the code', async () => {
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const result = await transform(value)

      expect(result).toContain('data-pre-language="js"')
      expect(result).toContain('data-pre-label="JavaScript"')
    })

    it('should label from the highlight.js display name', async () => {
      const value = '<pre><code class="language-crystal">puts "hi"</code></pre>'
      const result = await transform(value)

      expect(result).toContain('data-pre-language="crystal"')
      expect(result).toContain('data-pre-label="Crystal"')
    })

    it('should override messy highlight.js names', async () => {
      const value = '<pre data-language="php">echo 1;</pre>'
      const result = await transform(value)

      expect(result).toContain('data-pre-language="php"')
      expect(result).toContain('data-pre-label="PHP"')
    })

    it('should not add data-pre-* attributes to a block left unhighlighted', async () => {
      const value =
        '<pre><code>Note: this matters; really, it does. See also: the docs.</code></pre>'

      expect(await transform(value)).not.toContain('data-pre')
    })

    it('should leave a block declared as plain text unlabeled', async () => {
      const value = '<pre><code class="language-text">just some plain text</code></pre>'
      const result = await transform(value)

      expect(result).not.toContain('data-pre')
      expect(result).not.toContain('hljs')
      expect(result).toContain('just some plain text')
    })
  })

  describe('custom highlightFn', () => {
    it('should use a custom highlightFn from the context instead of hljs', async () => {
      const highlightFn: HighlightFn = (text, language) =>
        `<span class="custom-${language}">${text}</span>`
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const result = await transform(value, { ...baseContext, highlightFn })

      expect(result).toContain('<span class="custom-js">const x = 1</span>')
      expect(result).toContain('data-pre-language="js"')
      expect(result).not.toContain('hljs-keyword')
    })

    it('should leave a block plain when the custom highlightFn returns undefined', async () => {
      const highlightFn: HighlightFn = () => undefined
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const result = await transform(value, { ...baseContext, highlightFn })

      expect(result).toBe(value)
    })

    it('should support an async highlightFn', async () => {
      const highlightFn: HighlightFn = async (text) => `<i>${text}</i>`
      const value = '<pre><code class="language-js">const x = 1</code></pre>'
      const result = await transform(value, { ...baseContext, highlightFn })

      expect(result).toContain('<i>const x = 1</i>')
    })
  })

  describe('pre>code structure', () => {
    it('should wrap a bare pre content in a code', async () => {
      const value = '<pre>plain preformatted text</pre>'

      expect(await transform(value)).toBe('<pre><code>plain preformatted text</code></pre>')
    })

    it('should leave a pre whose only child is a code unchanged', async () => {
      const value = '<pre><code>plain text</code></pre>'

      expect(await transform(value)).toBe(value)
    })

    it('should not nest the code when a Pygments empty span precedes it', async () => {
      const value = '<pre><span></span><code>plain text</code></pre>'

      // The existing <code> is left in place (stripEmptyTags drops the empty span
      // later); the point is that it is not wrapped in a second <code>.
      const result = await transform(value)

      expect(result).not.toContain('<code><code>')
      expect(result).toBe(value)
    })

    it('should not nest the code when it is buried under wrapper divs', async () => {
      const value = '<pre><div class="hl"><code>plain text</code></div></pre>'

      const result = await transform(value)

      expect(result).not.toContain('<code><code>')
      expect(result).toBe(value)
    })

    it('should wrap a pre with no code child, keeping empty line spans', async () => {
      const value = '<pre><span class="line"></span><br><span class="line">x = 1</span></pre>'

      expect(await transform(value)).toBe(
        '<pre><code><span class="line"></span><br><span class="line">x = 1</span></code></pre>',
      )
    })

    it('should move the in-place hljs class onto the new code', async () => {
      const value = '<pre data-language="bash">npm i</pre>'
      const result = await transform(value)

      expect(result).toContain('<code class="hljs">')
      expect(result).not.toContain('<pre class="hljs"')
    })
  })
})
