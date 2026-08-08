import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, isElement, isText, walkElements } from '../../utils/dom.js'
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
//   9. A standalone class that is itself a grammar name (3+ chars) — class="haskell";
//      older/hand-rolled templates with no prefix or wrapper token.
// A block with no language hint stays plain: no relevance-based or shape-based
// guessing, which mostly guesses wrong on short feed snippets.
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

  // Bare language-name class: class="haskell", class="python" — older or hand-rolled
  // templates name the language as a standalone class, with no prefix or wrapper token.
  // Checked last so every explicit convention above wins. Accept a token that resolves
  // to a grammar; require 3+ chars so the short aliases (c, r, go, js, md) that double
  // as CSS utility classes cannot match.
  for (const element of candidates) {
    const tokens = element?.className.split(whitespaceRegex) ?? []
    const language = tokens.find((token) => token.length >= 3 && isSupportedLanguage(token))

    if (language) {
      return language
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

// Diff markers a feed's own highlighter may ship inline; their presence is what
// switches highlightCode from overwriting the block to merging into it (below).
const diffMarkerTags = new Set(['ins', 'del'])

// Keeping the feed's own inline markup while highlighting.
//
// Some feeds ship code their own highlighter already laid out: each line in a
// block-level <div> (so the line breaks live in the DOM, not in newlines) and
// added/removed lines tagged with <ins>/<del>. Overwriting innerHTML with the
// highlight output would flatten every line onto one row and throw the diff
// markers away. So when a block carries diff markers, the highlight token spans
// are merged into its existing markup rather than replacing it.
//
// The merge is highlight.js's own algorithm. It was deprecated out of hljs core
// in v11 and never published as a standalone package, so it is ported here from
// the last version that shipped it: the mergeHTMLPlugin in
// highlight.js/src/plugins/merge_html.js at tag 10.7.3 (its nodeStream and
// mergeStreams functions). Background on the removal: highlightjs/highlight.js#2889.
//
// Both the original element and the highlight output are walked into streams of
// start/stop events keyed by character offset, then interleaved: on each original
// tag the open highlight spans are closed, the original tag is emitted, and the
// spans are reopened, so the result stays well nested. Two changes from the
// upstream plugin: it ran as a browser-DOM after:highlightElement hook, this calls
// the functions directly so it works server-side under linkedom; and every
// attribute except `class` (the highlight token) is dropped here, so no
// feed-supplied style/href/event handler rides through (that injection risk is the
// reason hljs removed it from core).
type MarkupEvent = { event: 'start' | 'stop'; offset: number; node: Element }

const collectMarkupStream = (root: Element): Array<MarkupEvent> => {
  const events: Array<MarkupEvent> = []

  const walk = (node: Node, startOffset: number): number => {
    let offset = startOffset

    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (isText(child)) {
        offset += child.nodeValue?.length ?? 0
      } else if (isElement(child)) {
        events.push({ event: 'start', offset, node: child })
        offset = walk(child, offset)
        events.push({ event: 'stop', offset, node: child })
      }
    }

    return offset
  }

  walk(root, 0)

  return events
}

// Walk a block once, producing its flattened text — block-level line wrappers
// (div/p/li/tr) become `\n`, so textContent's run-together lines are restored — AND
// the <ins>/<del> diff-marker events keyed to those same offsets. Doing both in one
// walk is the point: the text fed to the highlighter and the markers fed to the merge
// can never disagree about where the newlines are. Everything that is not a diff
// marker is unwrapped (its text kept, the element dropped), so the line wrappers
// dissolve into the `\n`s and any feed coloring spans are discarded — the block is
// re-highlighted cleanly with only its diff markers preserved.
const collectDiffStream = (target: Element): { text: string; events: Array<MarkupEvent> } => {
  let text = ''
  const events: Array<MarkupEvent> = []

  // Iterative pre-order walk (explicit stack, not recursion) so a deeply nested code
  // block can't overflow the call stack. A diff marker pushes a close sentinel before
  // its children so its stop event lands after the subtree; children are pushed in
  // reverse to pop in document order. The \n insertion mirrors getCodeBlockText's.
  const stack: Array<Node | { closeFor: Element }> = [target]

  while (stack.length > 0) {
    const item = stack.pop() as Node | { closeFor: Element }

    if ('closeFor' in item) {
      events.push({ event: 'stop', offset: text.length, node: item.closeFor })
      continue
    }

    if (isText(item)) {
      text += item.nodeValue ?? ''
      continue
    }

    if (!isElement(item)) {
      continue
    }

    if (item !== target && blockLineWrappers.has(item.localName) && text && !text.endsWith('\n')) {
      text += '\n'
    }

    if (diffMarkerTags.has(item.localName)) {
      events.push({ event: 'start', offset: text.length, node: item })
      stack.push({ closeFor: item })
    }

    const children = item.childNodes

    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index])
    }
  }

  return { text, events }
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const openTag = (node: Element): string => {
  const className = node.getAttribute('class')

  return className ? `<${node.localName} class="${escapeHtml(className)}">` : `<${node.localName}>`
}

const closeTag = (node: Element): string => {
  return `</${node.localName}>`
}

const mergeMarkupStreams = (
  original: Array<MarkupEvent>,
  highlighted: Array<MarkupEvent>,
  text: string,
): string => {
  let processed = 0
  let result = ''
  const openSpans: Array<Element> = []

  // The two streams are ordered by offset. At a tie, the original stream opens
  // first and closes last so it always wraps the highlight spans, never the
  // other way around.
  const selectStream = (): Array<MarkupEvent> => {
    if (!original.length || !highlighted.length) {
      return original.length ? original : highlighted
    }

    if (original[0].offset !== highlighted[0].offset) {
      return original[0].offset < highlighted[0].offset ? original : highlighted
    }

    return highlighted[0].event === 'start' ? original : highlighted
  }

  const render = (item: MarkupEvent): void => {
    result += item.event === 'start' ? openTag(item.node) : closeTag(item.node)
  }

  while (original.length || highlighted.length) {
    let stream = selectStream()
    result += escapeHtml(text.slice(processed, stream[0].offset))
    processed = stream[0].offset

    if (stream === original) {
      // Close every open highlight span, emit all original tags landing on this
      // offset, then reopen the highlight spans so nesting stays valid.
      for (let index = openSpans.length - 1; index >= 0; index--) {
        result += closeTag(openSpans[index])
      }

      do {
        render(stream.splice(0, 1)[0])
        stream = selectStream()
      } while (stream === original && stream.length && stream[0].offset === processed)

      for (const span of openSpans) {
        result += openTag(span)
      }
    } else {
      const item = stream[0]

      if (item.event === 'start') {
        openSpans.push(item.node)
      } else {
        openSpans.pop()
      }

      render(stream.splice(0, 1)[0])
    }
  }

  return result + escapeHtml(text.slice(processed))
}

// Line-number gutters: Rouge/Pygments/Chroma (and others) render code in a two-column
// table (numbers | code), and Chroma/Prism also emit per-line number spans. Either way
// the digits get treated as a separate code block or walked into the highlighted text.
// Drop them before highlighting: keep only the code column's <pre>, and remove inline
// per-line number spans.

const integerLineRegex = /^\d+$/

// A node is a line-number gutter when every non-empty line of its text is just an
// integer. Detected structurally (not by class) so any highlighter's table is covered.
const isLineNumberText = (text: string): boolean => {
  const lines = text.split('\n').reduce<Array<string>>((accumulator, line) => {
    const trimmed = line.trim()

    if (trimmed) {
      accumulator.push(trimmed)
    }

    return accumulator
  }, [])

  return lines.length > 0 && lines.every((line) => integerLineRegex.test(line))
}

// Inline per-line number spans (Chroma `.ln`/`.lnt`, Prism `.line-numbers-rows`,
// Pygments `linenos=inline` `.lineno`).
// Class-based on purpose: a bare numeric span can't be told from a real number token
// in highlighted code, so structural detection would corrupt the code.
const gutterLineSpanSelector = 'span.line-numbers-rows, span.ln, span.lnt, span.lineno'

const stripCodeGutters = (document: Document): void => {
  for (const table of document.querySelectorAll('table')) {
    const pres = Array.from(table.querySelectorAll('pre'))

    if (pres.length === 0) {
      continue
    }

    // Only a code table with a line-number cell — never a data table.
    const cells = table.querySelectorAll('td, th, pre')
    const hasGutter = Array.from(cells).some((cell) => isLineNumberText(cell.textContent ?? ''))

    if (!hasGutter) {
      continue
    }

    // The code <pre> is the largest one that isn't itself the line-number column.
    const codePre = pres
      .filter((pre) => !isLineNumberText(pre.textContent ?? ''))
      .sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0]

    if (codePre) {
      // Rouge and similar wrap the gutter table inside the block's own <pre><code>.
      // Replacing the table with the code column's <pre> would nest a <pre> inside that
      // <code>. When such an outer <pre> exists, keep it as the block: move the code
      // column's content in place of the table and mark the outer <pre> as numbered.
      const wrapperPre = table.closest('pre')

      if (wrapperPre) {
        wrapperPre.setAttribute('data-pre-numbered', '')
        const codeColumn = codePre.querySelector('code') ?? codePre
        // Keep the code column's language when the surviving block declares none, so a
        // language that lives only on the code column (not on the wrapper) is not lost.
        const languageTarget = table.closest('code') ?? wrapperPre
        const columnLanguage = codeColumn.className.match(languageRegex)?.[0]
        if (columnLanguage && !languageRegex.test(languageTarget.className)) {
          languageTarget.classList.add(columnLanguage)
        }
        table.replaceWith(...codeColumn.childNodes)
      } else {
        codePre.setAttribute('data-pre-numbered', '')
        table.replaceWith(codePre)
      }
    }
  }

  for (const span of document.querySelectorAll(gutterLineSpanSelector)) {
    // Only strip a gutter span inside a code block. A stray span carrying one of these
    // class names in ordinary prose is left alone.
    if (!span.closest('pre, code')) {
      continue
    }

    span.closest('pre')?.setAttribute('data-pre-numbered', '')
    span.remove()
  }
}

// Tags whose presence means this transform has work to do. Gutter spans are only stripped
// inside these, so a gutter class alone (outside any code block) is no longer a signal.
const highlightSignalTags = new Set(['pre', 'code', 'table'])

export const highlightCode: DomTransform = ({ highlightFn }) => {
  return async (document) => {
    // Most feed items carry no code. One walk (see walkElements) checks that up
    // front, instead of the five querySelectorAll calls below finding nothing.
    const hasWork = walkElements(document, (element) => highlightSignalTags.has(element.localName))

    if (!hasWork) {
      return
    }

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

      const rawContentLines = collectDiffStream(code).text.split('\n')
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

      // Skip blocks this transform already processed, so a re-run does not re-merge
      // or re-overwrite. Keyed on our own data-pre-language marker, not the hljs
      // class — a feed that shipped its own highlight.js output carries hljs but no
      // marker, so it is still re-highlighted and badged like any other block (its
      // spans are dropped by reading textContent / the merge's stream, below).
      if (pre.hasAttribute('data-pre-language')) {
        continue
      }

      const { text, events: diffEvents } = collectDiffStream(target)

      if (!text.trim()) {
        continue
      }

      // A code block is highlighted only when its language is declared via a hint
      // (language-* class, data-language, etc.). A block with no hint stays plain:
      // auto-detection, even the deterministic parses-as-JSON kind, guesses a language
      // the feed never marked and reads as inconsistent across unlabeled blocks.
      const language = detectLanguage(pre, code)

      if (language === undefined) {
        continue
      }

      // A block explicitly marked as plain text is just text — leave it untouched.
      if (plaintextLanguages.has(language.toLowerCase())) {
        continue
      }

      const highlighted = await highlightFn(text, language)

      // The highlighter does not know this language — leave the block plain, with no badge.
      if (highlighted === undefined) {
        continue
      }

      if (diffEvents.length > 0) {
        // A block with diff markers keeps them: the highlight token spans are merged
        // into the markers instead of overwriting. `text` and `diffEvents` come from the
        // same walk, so the highlighter sees real line breaks (block wrappers became \n)
        // and its offsets line up with the markers. The line wrappers themselves dissolve
        // into the \n, exactly as the overwrite path flattens them.
        const highlightedRoot = document.createElement('div')
        highlightedRoot.innerHTML = highlighted
        target.innerHTML = mergeMarkupStreams(
          diffEvents,
          collectMarkupStream(highlightedRoot),
          text,
        )
      } else {
        target.innerHTML = highlighted
      }

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
