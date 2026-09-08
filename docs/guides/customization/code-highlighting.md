---
title: "Customization: Code Highlighting"
---

# Customize Code Highlighting

The `highlightCode` transform detects each code block's language from the markup, highlights it, and annotates the `<pre>` for styling. The `highlightFn` option swaps the highlighter; the detection stays feedsweep's.

## The Policy: Labeled Blocks Only

Feedsweep highlights a block only when the markup declares its language: a `language-*` class, a `data-language` attribute, a highlighter wrapper class, a filename caption. A block with no hint stays plain. There is no shape-based or statistical guessing, which mostly guesses wrong on short feed snippets.

`detectLanguage` (exported, if you want to reuse it) reads the declared language from the conventions of the common highlighters and platforms: Prism and highlight.js classes, Shiki and Chroma data attributes, Pandoc's `sourceCode` classes, WordPress plugin formats (SyntaxHighlighter Evolved, Crayon, EnlighterJS), Jekyll/Rouge and Pygments wrappers, GitHub and Sphinx wrapper classes, filename captions, and bare grammar-name classes as the last resort.

## highlightFn

```typescript
type HighlightFn = (text: string, language: string) => string | undefined | Promise<string | undefined>
```

Called with the block's plain text and the detected language token. Return the highlighted inner HTML, or `undefined` when your highlighter does not know the language, which leaves the block plain and keeps its language annotation.

The default is `hljsHighlightFn`: highlight.js's common grammar set plus extra grammars frequent in feed code blocks (Elixir, Haskell, Dockerfile, PowerShell, LaTeX, and some thirty more), plus alias mappings for hint tokens highlight.js does not resolve on its own (`python3`, `jsonc`, `racket`, `nasm`, …).

Plugging in another highlighter:

```typescript
import { codeToHtml } from 'shiki'

const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  highlightFn: async (text, language) => {
    try {
      return await codeToHtml(text, { lang: language, theme: 'github-dark' })
    } catch {
      return undefined
    }
  },
})
```

Passing `highlightFn: () => undefined` disables highlighting while keeping detection: blocks still get their language and label attributes, and gutter cleanup still runs.

## What the Transform Does Around the Highlighter

`highlightCode` is more than a `highlightFn` call:

- **Line-number gutters are stripped.** The number column of Rouge/Pygments/Chroma code tables and inline per-line number spans are removed so digits never leak into the code text. Blocks that had them are marked `data-pre-numbered`.
- **Wrapped lines are read correctly.** Highlighters that lay out one line per `<div>` are read with line breaks restored, not flattened into one row.
- **Standalone multi-line `<code>` is promoted** to a proper `<pre><code>` block. A single-content-line `<code>` stays inline however much whitespace surrounds it.

## Output Annotations

Each highlighted or language-labeled block carries:

| Attribute | Value |
|-----------|-------|
| `data-pre-language` | The canonical language token (`typescript`) |
| `data-pre-label` | The display name for a badge (`TypeScript`) |
| `data-pre-numbered` | Present when a line-number gutter was stripped |

See [Data Attributes](/output/data-attributes#code-blocks-data-pre) for how these render downstream. Blocks declared as plain text (`plaintext`, `text`, `txt`) are deliberately left unannotated: a "Plain text" badge says nothing a code block does not already convey.

## Preserved Blocks

Adjacent one-line `<pre>` blocks are merged into one block by `mergeConsecutiveOneLinerPres`, because fragmented code is far more common in feeds than deliberate runs of one-line blocks. A built-in list of class tokens marks a `<pre>` as author-chosen formatting (by default WordPress's Verse and Preformatted blocks) so poems and tables of contents never merge. The token list is [built in](/guides/built-in).
