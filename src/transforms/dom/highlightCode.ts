import { toMap } from 'trousse'
import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, isElement, isText, text, walkElements } from '../../utils/dom.js'
import labels from './highlightCode.json' with { type: 'json' }

// The languages feedsweep recognizes, keyed by token (and alias). Used both to
// disambiguate the wrapper-class detection paths below and to label the badge.
const supportedLabels = toMap(labels)

const isSupportedLanguage = (token: string): boolean => {
  return supportedLabels.has(token.toLowerCase())
}

// Prism, highlight.js, Ghost, Hugo Chroma, Rouge and most Markdown renderers write language-X.
const languageRegex = /(?:language|lang)-(\S+)/
// data-language/-lang cover most editors and renderers. data-enlighter-language is
// EnlighterJS (WordPress). EnlighterJS's "generic" value maps to no grammar, so such
// a block stays plain, which is the intent (it means "no specific language").
const languageAttributes = ['data-language', 'data-lang', 'data-enlighter-language']
const brushRegex = /brush:\s*([\w#+-]+)/
const crayonRegex = /\blang[:_]([\w#+-]+)/
const whitespaceRegex = /\s+/
// Pandoc emits class="sourceCode LANG". These tokens are structural, not the language.
const pandocStructuralClasses = new Set(['sourceCode', 'numberLines'])
// Jekyll/Rouge and similar wrap the block, putting the language-* class on an
// ancestor div, not on the pre/code. Look at most this many levels up.
const maxLanguageAncestorDepth = 3
// Expressive Code (Astro/Starlight) titles its blocks with the source filename.
// A whitespace-free name ending in an extension yields the language token (the
// last extension, so paths like .vscode/settings.json resolve to json).
const filenameRegex = /^\S+\.(\w+)$/
// GitHub/Linguist wrapper class: highlight-source-LANG / highlight-text-LANG (the
// source-/text- prefix is signal enough to trust a one-letter LANG like -c).
const githubLanguageRegex = /^highlight-(?:source|text)-([a-z0-9+#]+)/
// A one-letter highlight-c or highlight-r is a CSS utility class, not a language.
const sphinxLanguageRegex = /^highlight-([a-z][a-z0-9+#]+)$/

// The language a code block declares, in whichever highlighter or platform convention.
export const detectLanguage = (pre: Element | null, code: Element | null): string | undefined => {
  // Check language-* / lang-* class on <code>, then <pre>, then the pre's
  // wrapping ancestors: Jekyll/Rouge puts the class on an outer div:
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

  // Pandoc, class="sourceCode LANG". The language is the sibling class token.
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

  // Expressive Code, <figure><figcaption>FILENAME</figcaption><pre>…. No class or
  // data-language survives into the feed, so infer the language from the title's
  // file extension. Resolution (incl. js->javascript, yml->yaml) is left to the caller.
  const figure = pre?.parentNode

  if (isElement(figure) && figure.localName === 'figure') {
    const figcaption = figure.querySelector('figcaption')
    const extension = text(figcaption)?.match(filenameRegex)?.[1]

    if (extension) {
      return extension
    }
  }

  // Forem/dev.to and Pygments write class="highlight LANG" on the <pre> or a wrapping div, and the
  // same classes also carry non-language tokens like "highlight selected" and "highlight line".
  for (const element of candidates) {
    const tokens = element?.className.split(whitespaceRegex) ?? []

    if (tokens.includes('highlight')) {
      const language = tokens.find((token) => token !== 'highlight' && isSupportedLanguage(token))

      if (language) {
        return language
      }
    }
  }

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

  // A two-letter token like go, js or md is as often a CSS utility class as a language.
  // Older or hand-rolled templates name the language as a standalone class, like class="haskell".
  for (const element of candidates) {
    const tokens = element?.className.split(whitespaceRegex) ?? []
    const language = tokens.find((token) => token.length >= 3 && isSupportedLanguage(token))

    if (language) {
      return language
    }
  }
}

// highlight.js maps plaintext, text and txt to a Plain text grammar that only escapes the text.
const plaintextLanguages = new Set(['plaintext', 'text', 'txt'])

const preTag = new Set(['pre'])

// Resolve a declared token to its badge label (case-insensitive, since hints
// arrive in any case like `language-Rust`). A token the map does not cover falls
// back to its capitalized form.
const labelForLanguage = (language: string): string => {
  const key = language.toLowerCase()
  return supportedLabels.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1)
}

// Block-level elements that some highlighters and editors use to lay out one
// code line each, with no newline character between them.
const blockLineWrappers = new Set(['div', 'p', 'li', 'tr'])

const getCodeBlockText = (target: Element): string => {
  let text = ''

  const stack: Array<Node> = [target]

  while (stack.length > 0) {
    const node = stack.pop() as Node

    if (isText(node)) {
      text += node.nodeValue ?? ''
      continue
    }

    if (!isElement(node)) {
      continue
    }

    if (node !== target && blockLineWrappers.has(node.localName) && text && !text.endsWith('\n')) {
      text += '\n'
    }

    const children = node.childNodes

    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index])
    }
  }

  return text
}

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

// Chroma writes .ln and .lnt, Prism .line-numbers-rows, Pygments .lineno under linenos=inline.
const gutterLineSpanSelector = 'span.line-numbers-rows, span.ln, span.lnt, span.lineno'

// Rouge, Pygments and Chroma render code in a two-column table of line numbers beside code.
const stripCodeGutters = (document: Document): void => {
  for (const table of document.querySelectorAll('table')) {
    const pres = Array.from(table.querySelectorAll('pre'))

    if (pres.length === 0) {
      continue
    }

    // Only a code table with a line-number cell: never a data table.
    const cells = table.querySelectorAll('td, th, pre')
    const hasGutter = Array.from(cells).some((cell) => isLineNumberText(cell.textContent ?? ''))

    if (!hasGutter) {
      continue
    }

    const codePre = pres
      .filter((pre) => !isLineNumberText(pre.textContent ?? ''))
      .sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0]

    if (codePre) {
      // Rouge wraps the gutter table inside the block's own <pre><code>.
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
// inside these, so a gutter class outside any code block is not a signal.
const highlightSignalTags = new Set(['pre', 'code', 'table'])

// A code block ships unhighlighted, its language named only by a class, attribute or wrapper.
export const highlightCode: DomTransform = ({ highlightFn }) => {
  return async (document) => {
    const hasWork = walkElements(document, (element) => highlightSignalTags.has(element.localName))

    if (!hasWork) {
      return
    }

    stripCodeGutters(document)

    // Some editors emit a block of code as a standalone <code> with no <pre> wrapper.
    for (const code of document.querySelectorAll('code')) {
      if (hasAncestorWithTagName(code, preTag)) {
        continue
      }

      const rawContentLines = getCodeBlockText(code).split('\n')
      const nonEmptyContentLines = rawContentLines.filter((line) => line.trim())

      // A pretty-printing feed wraps inline <code>word</code> in newlines, so one line is no block.
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
      // the <pre> with the language hint on the <pre> itself.
      const code = pre.querySelector('code')
      const target = code ?? pre

      const text = getCodeBlockText(target)

      if (!text.trim()) {
        continue
      }

      const language = detectLanguage(pre, code)

      if (language === undefined) {
        continue
      }

      if (plaintextLanguages.has(language.toLowerCase())) {
        continue
      }

      const highlighted = await highlightFn(text, language)

      // The highlighter does not know this language: leave the block plain, with
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

    // Pygments writes a stray empty <span> ahead of the <code>, as <pre><span></span><code>….
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
