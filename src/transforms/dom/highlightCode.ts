import {
  hasAncestorWithTagName,
  isElement,
  isJsonLike,
  isParseableJson,
  isText,
} from '../../common.js'
import type { DomTransform } from '../../types.js'
// Token -> display-label map for the languages feedsweep recognizes (canonical
// names plus common aliases). Read from here so detecting and labelling a code
// block needs no highlight.js import — the only place that touches hljs is the
// highlighter itself. Hand-maintained: add a token when adding a grammar.
import labels from './highlightCode.json' with { type: 'json' }

// The languages feedsweep recognizes, keyed by token (and alias). Used both to
// disambiguate the wrapper-class detection paths below and to label the badge.
const supportedLabels = labels as Record<string, string>

const isSupportedLanguage = (token: string): boolean => {
  return supportedLabels[token.toLowerCase()] !== undefined
}

const languageRegex = /(?:language|lang)-(\S+)/
// data-language/-lang cover most editors and renderers; data-enlighter-language is
// EnlighterJS (WordPress). EnlighterJS's "generic" value maps to no grammar, so such
// a block stays plain — which is the intent (it means "no specific language").
const languageAttributes = ['data-language', 'data-lang', 'data-enlighter-language']
const brushRegex = /brush:\s*([\w#+-]+)/
const crayonRegex = /\blang[:_]([\w#+-]+)/
const whitespaceRegex = /\s+/
// Pandoc emits class="sourceCode LANG"; these tokens are structural, not the language.
const pandocStructuralClasses = new Set(['sourceCode', 'numberLines'])
// Jekyll/Rouge and similar wrap the block, putting the language-* class on an
// ancestor div, not on the pre/code. Look at most this many levels up.
const maxLanguageAncestorDepth = 3
// Expressive Code (Astro/Starlight) titles its blocks with the source filename;
// a whitespace-free name ending in an extension yields the language token (the
// last extension, so paths like .vscode/settings.json resolve to json).
const filenameRegex = /^\S+\.(\w+)$/
// GitHub/Linguist wrapper class: highlight-source-LANG / highlight-text-LANG (the
// source-/text- prefix is signal enough to trust a one-letter LANG like -c).
const githubLanguageRegex = /^highlight-(?:source|text)-([a-z0-9+#]+)/
// Sphinx/RST wrapper class: bare highlight-LANG. Require 2+ chars so one-letter
// classes (highlight-c, highlight-r) that are really CSS utilities don't match.
const sphinxLanguageRegex = /^highlight-([a-z][a-z0-9+#]+)$/

// Catalog of the code-highlighter / platform conventions detectLanguage recognizes
// (prevalences measured against the real-feed corpus). In priority order it reads:
//   1. language-X / lang-X class on <code>/<pre>, or on a wrapping ancestor — Prism,
//      highlight.js, Ghost, Hugo Chroma, Jekyll/Rouge, and most Markdown renderers
//      (by far the most common).
//   2. data-language / data-lang — Shiki, Astro, Hugo Chroma, Discourse, Docusaurus;
//      data-enlighter-language — EnlighterJS (WordPress).
//   3. class="sourceCode LANG" — Pandoc.
//   4. class="brush: LANG" — SyntaxHighlighter Evolved (WordPress).
//   5. class="lang:LANG" / lang_LANG — Crayon (WordPress).
//   6. <figure><figcaption>file.ext</figcaption> filename — Expressive Code (Astro).
//   7. class="highlight LANG" (LANG resolving to a grammar) — Forem/dev.to, Pygments.
//   8. highlight-source-LANG / highlight-LANG wrapper class — GitHub/Linguist, Sphinx.
// An unlabeled <pre><code> is highlighted only when it parses as JSON; anything
// else stays plain (no relevance-based language guessing).
export const detectLanguage = (pre: Element | null, code: Element | null): string | undefined => {
  // Check language-* / lang-* class on <code>, then <pre>, then the pre's
  // wrapping ancestors — Jekyll/Rouge puts the class on an outer div:
  // <div class="language-rb highlighter-rouge"><div class="highlight"><pre>…
  const candidates: Array<Element | null> = [code, pre]

  for (
    let ancestor = pre?.parentNode ?? null, depth = 0;
    ancestor && depth < maxLanguageAncestorDepth;
    ancestor = ancestor.parentNode, depth++
  ) {
    if (isElement(ancestor)) {
      candidates.push(ancestor)
    }
  }

  for (const element of candidates) {
    const match = element?.className.match(languageRegex)?.[1]

    if (match) {
      return match
    }
  }

  // Check data-language / data-lang (and EnlighterJS's data-enlighter-language) on
  // <pre>, then <code>.
  for (const element of [pre, code]) {
    for (const attribute of languageAttributes) {
      const value = element?.getAttribute(attribute)

      if (value) {
        return value
      }
    }
  }

  // Pandoc: class="sourceCode LANG" — the language is the sibling class token.
  for (const element of [code, pre]) {
    const tokens = element?.className.split(whitespaceRegex) ?? []

    if (tokens.includes('sourceCode')) {
      const language = tokens.find((token) => token && !pandocStructuralClasses.has(token))

      if (language) {
        return language
      }
    }
  }

  // WordPress SyntaxHighlighter Evolved: class="brush: LANG; ...".
  for (const element of [pre, code]) {
    const match = element?.className.match(brushRegex)?.[1]

    if (match) {
      return match
    }
  }

  // Crayon: class="lang:LANG" or "lang_LANG".
  for (const element of [pre, code]) {
    const match = element?.className.match(crayonRegex)?.[1]

    if (match) {
      return match
    }
  }

  // Expressive Code: <figure><figcaption>FILENAME</figcaption><pre>… — no class or
  // data-language survives into the feed, so infer the language from the title's
  // file extension. Resolution (incl. js->javascript, yml->yaml) is left to the caller.
  const figure = pre?.parentNode

  if (isElement(figure) && figure.localName === 'figure') {
    const figcaption = figure.querySelector('figcaption')
    const extension = figcaption?.textContent?.trim().match(filenameRegex)?.[1]

    if (extension) {
      return extension
    }
  }

  // Forem/dev.to and Pygments-style wrappers: class="highlight LANG" on the <pre>
  // or a wrapping div, where LANG is a bare class token. Accept it only when a
  // sibling token resolves to a grammar — that guard rejects the non-language
  // tokens these classes also carry (e.g. "highlight selected", "highlight line").
  for (const element of candidates) {
    const tokens = element?.className.split(whitespaceRegex) ?? []

    if (tokens.includes('highlight')) {
      const language = tokens.find((token) => token !== 'highlight' && isSupportedLanguage(token))

      if (language) {
        return language
      }
    }
  }

  // GitHub/Linguist (<div class="highlight highlight-source-LANG">) and Sphinx/RST
  // (<div class="highlight-LANG">) name the language in a wrapper class. Accept it
  // only when it resolves to a grammar. The bare Sphinx form also needs a 2+ char
  // token, since one-letter classes (highlight-c, highlight-r) collide with CSS
  // utilities; GitHub's source-/text- prefix is signal enough to skip that guard.
  for (const element of candidates) {
    const tokens = element?.className.split(whitespaceRegex) ?? []

    for (const token of tokens) {
      const language =
        token.match(githubLanguageRegex)?.[1] ?? token.match(sphinxLanguageRegex)?.[1]

      if (language && isSupportedLanguage(language)) {
        return language
      }
    }
  }
}

// highlight.js resolves these to its "Plain text" grammar, which only escapes the
// text — no tokens, no real language. A block declared as one of them is left
// untouched rather than badged "Plain text", which says nothing a code block does
// not already convey.
const plaintextLanguages = new Set(['plaintext', 'text', 'txt'])

const preTag = new Set(['pre'])

// Resolve a declared token to its badge label (case-insensitive, since hints
// arrive in any case like `language-Rust`). A token the map does not cover falls
// back to its capitalized form.
const labelForLanguage = (language: string): string => {
  const key = language.toLowerCase()
  return supportedLabels[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

// Block-level elements that some highlighters and editors use to lay out one
// code line each, with no newline character between them.
const blockLineWrappers = new Set(['div', 'p', 'li', 'tr'])

// Read a code block to text, treating those block-level line wrappers as line
// breaks. Reading textContent alone would flatten every wrapped line onto one
// row, because textContent just concatenates without honoring the layout. A
// break is added when a wrapper opens, skipped when the text is empty (so there
// is no leading break) or already ends with one (so nested wrappers like
// <div><div>line</div></div> and blank spacer lines collapse back to a single
// break). Blocks that carry real newlines, and inline highlighters, are
// unaffected: with no wrappers to open, the result equals textContent.
const getCodeBlockText = (target: Element): string => {
  let text = ''

  const walk = (node: Node): void => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (isText(child)) {
        text += child.nodeValue ?? ''
        continue
      }

      if (!isElement(child)) {
        continue
      }

      if (blockLineWrappers.has(child.localName) && text && !text.endsWith('\n')) {
        text += '\n'
      }

      walk(child)
    }
  }

  walk(target)

  return text
}

// Line-number gutters: Rouge/Pygments/Chroma render code in a two-column table
// (numbers | code), and Chroma/Prism also emit per-line number spans. Either way
// the digits get treated as a separate code block or walked into the highlighted
// text. Drop them before highlighting: keep only the code column's <pre>, and remove
// inline per-line number spans.
const gutterTableSelector = 'table.rouge-table, table.highlighttable, table.lntable'
const gutterLineSpanSelector = 'span.line-numbers-rows, span.ln, span.lnt'

const stripCodeGutters = (document: Document): void => {
  for (const table of document.querySelectorAll(gutterTableSelector)) {
    const pres = table.querySelectorAll('pre')
    // The gutter is the left column; the code is the last <pre>. Replace the whole
    // table with it, dropping the gutter column and the table scaffolding.
    const codePre = pres[pres.length - 1]

    if (codePre) {
      table.replaceWith(codePre)
    }
  }

  for (const span of document.querySelectorAll(gutterLineSpanSelector)) {
    span.remove()
  }
}

export const highlightCode: DomTransform = ({ highlightFn }) => {
  return async (document) => {
    stripCodeGutters(document)

    // Some editors emit a block of code as a standalone <code> with no <pre> wrapper.
    // Promote those to <pre><code> first so the loop below treats them like any other
    // block: highlighted by a declared hint (or detected JSON), and rendered as a
    // block (a loose <code> renders inline, collapsing the newlines). The signal
    // is two or more non-empty lines, not just any newline: feeds often pretty-print
    // their HTML, wrapping an inline <code>word</code> as `<code>\n  word\n </code>`,
    // so a lone newline does not mean block. A single content line stays inline.
    for (const code of document.querySelectorAll('code')) {
      if (hasAncestorWithTagName(code, preTag)) {
        continue
      }

      const rawContentLines = getCodeBlockText(code).split('\n')
      const nonEmptyContentLines = rawContentLines.filter((line) => line.trim())

      if (nonEmptyContentLines.length < 2) {
        continue
      }

      const parent = code.parentNode

      if (!parent) {
        continue
      }

      const pre = document.createElement('pre')
      parent.insertBefore(pre, code)
      pre.appendChild(code)
    }

    for (const pre of document.querySelectorAll('pre')) {
      // A <pre> usually wraps a <code>, but some editors put the code directly in
      // the <pre> with the language hint on the <pre> itself. Highlight the <code>
      // when present, otherwise the <pre> itself.
      const code = pre.querySelector('code')
      const target = code ?? pre

      const text = getCodeBlockText(target)

      if (!text.trim()) {
        continue
      }

      // A code block is highlighted only when its language is known: declared via a
      // hint (language-* class, data-language, etc.), or detected as JSON. JSON is
      // the one detection kept because it is deterministic — the text actually parses
      // as JSON — unlike relevance-based auto-detection, which mostly guesses wrong on
      // short feed snippets. An unlabeled non-JSON block stays plain. The JSON check
      // is limited to a <pre><code> (a bare <pre> is as often plain preformatted text
      // as code).
      const declared = detectLanguage(pre, code)

      // A block explicitly marked as plain text is just text — leave it untouched.
      if (declared && plaintextLanguages.has(declared.toLowerCase())) {
        continue
      }

      let language: string | undefined

      if (declared) {
        language = declared
      } else if (code && isJsonLike(text) && isParseableJson(text)) {
        language = 'json'
      }

      if (language === undefined) {
        continue
      }

      const highlighted = await highlightFn(text, language)

      // The highlighter does not know this language — leave the block plain, with
      // no badge.
      if (highlighted === undefined) {
        continue
      }

      target.innerHTML = highlighted
      target.classList.add('hljs')

      // Expose the resolved language for a frontend badge. The attributes stay on
      // the <pre> (kept as a static container by the wrapping pass below), so a
      // badge anchored to it stays put while the inner <code> scrolls.
      pre.setAttribute('data-pre-language', language)
      pre.setAttribute('data-pre-label', labelForLanguage(language))
    }

    // Give a bare code block the <pre><code> structure: the <pre> stays a static
    // container (a stable anchor for the language badge) and the new <code> is
    // what scrolls. A bare <pre> highlighted in place carries the hljs class,
    // which moves onto the new <code> so the theme styles the element holding the
    // token spans.
    //
    // Only wrap a <pre> that has no <code> at all. A <pre> that already contains
    // one must be left as is: wrapping it would nest <code> inside <code>, which
    // defeats trimPreWhitespace (its first line would start with a <code> tag, so
    // the common indent reads as zero and the block is never de-indented). This
    // covers Pygments' stray leading empty <span> (<pre><span></span><code>…) and
    // code buried under wrapper <div>s alike; the empty <span> is dropped later by
    // stripEmptyTags.
    const presToWrap = Array.from(document.querySelectorAll('pre')).filter(
      (pre) => !pre.querySelector('code'),
    )

    for (const pre of presToWrap) {
      const code = document.createElement('code')

      while (pre.firstChild) {
        code.appendChild(pre.firstChild)
      }

      if (pre.classList.contains('hljs')) {
        pre.classList.remove('hljs')
        code.classList.add('hljs')

        // Drop a now-empty class attribute so parsers do not serialize class="".
        if (pre.classList.length === 0) {
          pre.removeAttribute('class')
        }
      }

      pre.appendChild(code)
    }
  }
}
