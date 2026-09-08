---
title: "Transforms: Code Blocks"
---

# Code Blocks

Feeds deliver code in dozens of markups: per-line `<pre>` stacks, `<br>`-separated lines, line-number gutter tables, redundant nested wrappers. These transforms converge them all onto one shape, `<pre><code>` with real newlines, and highlight blocks whose language the feed declares.

### replacePreLineBreaks

Replaces `<br>` inside `<pre>` with newline characters. Whitespace is preserved in `<pre>`, so the `<br>` is redundant, and it breaks highlighting, which needs real newlines to see the block's lines.

**Before**

```html
<pre><code class="language-js">const a = 1<br>const b = 2</code></pre>
```

**After**

```html
<pre><code class="language-js">const a = 1
const b = 2</code></pre>
```

### unwrapNestedCodeWrappers

Collapses a `<code>` nested directly inside another `<code>` (or a `<pre>` inside a `<pre>`) into a single wrapper. Code is usually styled with a relative font size, so every extra nesting level shrinks the text further.

**Before**

```html
<pre><code><code>console.log('hi')</code></code></pre>
```

**After**

```html
<pre><code>console.log('hi')</code></pre>
```

### highlightCode

Highlights code blocks whose language the feed declares, strips line-number gutters, and normalizes bare blocks into `<pre><code>`.

The language comes from `detectLanguage`, which reads the conventions real platforms emit, in priority order:

1. `language-*` / `lang-*` class on the `<code>`, `<pre>`, or a wrapping ancestor: Prism, highlight.js, Ghost, Hugo, Jekyll, and most Markdown renderers
2. `data-language` / `data-lang` (Shiki, Astro, Hugo, Discourse, Docusaurus), and `data-enlighter-language` (EnlighterJS)
3. `class="sourceCode LANG"`: Pandoc
4. `class="brush: LANG"`: SyntaxHighlighter Evolved (WordPress)
5. `class="lang:LANG"` / `lang_LANG`: Crayon (WordPress)
6. A `<figcaption>` filename whose extension names the language: Expressive Code (Astro)
7. `class="highlight LANG"` where `LANG` resolves to a known grammar: dev.to, Pygments
8. `highlight-source-LANG` / `highlight-LANG` wrapper class: GitHub-flavored markup, Sphinx
9. A standalone class that is itself a grammar name (3+ characters): `class="haskell"`

A block with no language hint stays plain. There is no shape-based or statistical guessing: a guessed language reads as inconsistent across unlabeled blocks and is often wrong on short snippets. A block explicitly declared `plaintext`, `text`, or `txt` is also left untouched.

The transform also:

- **Strips line-number gutters.** Rouge, Pygments, and Chroma render code as a two-column table of numbers and code; Chroma and Prism also emit per-line number spans. The gutter is dropped, the code column survives, and the block is marked `data-pre-numbered` so a renderer can restore numbering.
- **Promotes standalone blocks.** A loose `<code>` with two or more non-empty lines becomes `<pre><code>`, so it renders as a block instead of collapsing inline. A single content line stays inline, whatever the surrounding pretty-printed whitespace.
- **Wraps bare `<pre>`.** A `<pre>` with no `<code>` child gets one, so the `<pre>` stays a static container (a stable anchor for a language badge) while the inner `<code>` scrolls.

A highlighted block carries the resolved language on its `<pre>`:

**Before**

```html
<pre><code class="language-xml">&lt;feed&gt;&lt;/feed&gt;</code></pre>
```

**After**

```html
<pre data-pre-language="xml" data-pre-label="XML"><code class="language-xml hljs"><span class="hljs-tag">...</span></code></pre>
```

The highlighter itself is replaceable through the `highlightFn` option; see [Code Highlighting](/guides/customization/code-highlighting). The attributes a renderer can style are listed in [Data Attributes](/output/data-attributes).

### mergeConsecutiveOneLinerPres

Merges a run of consecutive single-line `<pre>` siblings into one block joined by newlines. Some editors, Medium among them, emit each code line as its own `<pre>`, which renders as a stack of separate boxes.

**Before**

```html
<pre><code>const a = 1</code></pre>
<pre><code>const b = 2</code></pre>
```

**After**

```html
<pre><code>const a = 1
const b = 2</code></pre>
```

A run is skipped when any of its blocks carries one of the preserved class tokens, `wp-block-verse` and `wp-block-preformatted` today. Those mark author-distinct content, poetry stanzas and scriptural verses, that is meant to stay as separate blocks even when single-line.

### trimPreWhitespace

Trims trailing whitespace and leading blank lines from `<pre>` blocks, and removes the common leading indentation shared by every content line. Feeds often indent code to match the surrounding HTML, which renders as a wall of left padding.

**Before**

```html
<pre><code>    const a = 1
    const b = 2</code></pre>
```

**After**

```html
<pre><code>const a = 1
const b = 2</code></pre>
```

Indentation is read through leading inline tags and `&nbsp;` entities alike, so highlighted lines wrapped in spans de-indent the same as plain ones.
