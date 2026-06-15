import type { LanguageFn } from 'highlight.js'
import hljs from 'highlight.js/lib/common'
import applescript from 'highlight.js/lib/languages/applescript'
import arduino from 'highlight.js/lib/languages/arduino'
import awk from 'highlight.js/lib/languages/awk'
import clojure from 'highlight.js/lib/languages/clojure'
import cmake from 'highlight.js/lib/languages/cmake'
import crystal from 'highlight.js/lib/languages/crystal'
import dart from 'highlight.js/lib/languages/dart'
import delphi from 'highlight.js/lib/languages/delphi'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import elixir from 'highlight.js/lib/languages/elixir'
import elm from 'highlight.js/lib/languages/elm'
import erlang from 'highlight.js/lib/languages/erlang'
import fsharp from 'highlight.js/lib/languages/fsharp'
import gherkin from 'highlight.js/lib/languages/gherkin'
import glsl from 'highlight.js/lib/languages/glsl'
import groovy from 'highlight.js/lib/languages/groovy'
import haskell from 'highlight.js/lib/languages/haskell'
import haxe from 'highlight.js/lib/languages/haxe'
import http from 'highlight.js/lib/languages/http'
import julia from 'highlight.js/lib/languages/julia'
import latex from 'highlight.js/lib/languages/latex'
import lisp from 'highlight.js/lib/languages/lisp'
import matlab from 'highlight.js/lib/languages/matlab'
import nginx from 'highlight.js/lib/languages/nginx'
import nix from 'highlight.js/lib/languages/nix'
import ocaml from 'highlight.js/lib/languages/ocaml'
import pgsql from 'highlight.js/lib/languages/pgsql'
import powershell from 'highlight.js/lib/languages/powershell'
import prolog from 'highlight.js/lib/languages/prolog'
import puppet from 'highlight.js/lib/languages/puppet'
import scala from 'highlight.js/lib/languages/scala'
import scheme from 'highlight.js/lib/languages/scheme'
import stata from 'highlight.js/lib/languages/stata'
import twig from 'highlight.js/lib/languages/twig'
import verilog from 'highlight.js/lib/languages/verilog'
import vim from 'highlight.js/lib/languages/vim'
import x86asm from 'highlight.js/lib/languages/x86asm'
import {
  hasAncestorWithTagName,
  isElement,
  isJsonLike,
  isParseableJson,
  isText,
} from '../../common.js'
import type { DomTransform } from '../../types.js'

// Languages absent from highlight.js's common build but common in feed code
// blocks (ranked by real-corpus hint frequency). Registering them lets an
// explicit class/attribute hint resolve to a grammar; a block with no match is
// left as plain text. Built-in aliases (hs->haskell, clj->clojure, ...) come
// along for free.
// Mathematica is deliberately left out for now: its grammar is ~148 KB (a
// built-in symbol table), too heavy for the ~0.006% of blocks that declare it.
const extraLanguages: Record<string, LanguageFn> = {
  applescript,
  arduino,
  awk,
  clojure,
  cmake,
  crystal,
  dart,
  delphi,
  dockerfile,
  elixir,
  elm,
  erlang,
  fsharp,
  gherkin,
  glsl,
  groovy,
  haskell,
  haxe,
  http,
  julia,
  latex,
  lisp,
  matlab,
  nginx,
  nix,
  ocaml,
  pgsql,
  powershell,
  prolog,
  puppet,
  scala,
  scheme,
  stata,
  twig,
  verilog,
  vim,
  x86asm,
}

for (const [name, grammar] of Object.entries(extraLanguages)) {
  hljs.registerLanguage(name, grammar)
}

// Popular hint tokens highlight.js does not resolve on its own, mapped to an
// already-registered grammar (frequencies from the real-feed corpus). Tokens it
// already aliases (console, objc, golang, cs, jsx, yml, sh, ...) need nothing.
// A few are dialect approximations to the nearest grammar (emacs-lisp/elisp and
// cl -> lisp, racket -> scheme, fish/tcsh/csh -> bash, terminal -> shell).
const languageAliases: Record<string, Array<string>> = {
  bash: ['fish', 'tcsh', 'csh'],
  c: ['clike'],
  json: ['jsonc', 'json5', 'jsonl'],
  lisp: ['emacs-lisp', 'elisp', 'cl', 'common-lisp', 'common_lisp', 'commonlisp'],
  objectivec: ['objective-c'],
  pgsql: ['psql'],
  python: ['python3', 'py3'],
  scheme: ['racket'],
  shell: ['shell-session', 'shell-script', 'shellscript', 'terminal'],
  sql: ['mysql', 'tsql', 'plsql'],
  vbnet: ['vb', 'visualbasic'],
  x86asm: ['asm', 'nasm', 'assembly'],
  xml: ['markup'],
}

for (const [languageName, aliases] of Object.entries(languageAliases)) {
  hljs.registerAliases(aliases, { languageName })
}

const languagePattern = /(?:language|lang)-(\S+)/
// data-language/-lang cover most editors and renderers; data-enlighter-language is
// EnlighterJS (WordPress). EnlighterJS's "generic" value maps to no grammar, so such
// a block stays plain — which is the intent (it means "no specific language").
const languageAttributes = ['data-language', 'data-lang', 'data-enlighter-language']
const brushPattern = /brush:\s*([\w#+-]+)/
const crayonPattern = /\blang[:_]([\w#+-]+)/
const whitespacePattern = /\s+/
// Pandoc emits class="sourceCode LANG"; these tokens are structural, not the language.
const pandocStructuralClasses = new Set(['sourceCode', 'numberLines'])
// Jekyll/Rouge and similar wrap the block, putting the language-* class on an
// ancestor div, not on the pre/code. Look at most this many levels up.
const maxLanguageAncestorDepth = 3
// Expressive Code (Astro/Starlight) titles its blocks with the source filename;
// a whitespace-free name ending in an extension yields the language token (the
// last extension, so paths like .vscode/settings.json resolve to json).
const filenamePattern = /^\S+\.(\w+)$/
// GitHub/Linguist wrapper class: highlight-source-LANG / highlight-text-LANG (the
// source-/text- prefix is signal enough to trust a one-letter LANG like -c).
const githubLanguagePattern = /^highlight-(?:source|text)-([a-z0-9+#]+)/
// Sphinx/RST wrapper class: bare highlight-LANG. Require 2+ chars so one-letter
// classes (highlight-c, highlight-r) that are really CSS utilities don't match.
const sphinxLanguagePattern = /^highlight-([a-z][a-z0-9+#]+)$/

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
// An unlabeled <pre><code> falls back to the gated subset auto-detection below.
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
    const match = element?.className.match(languagePattern)?.[1]

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
    const tokens = element?.className.split(whitespacePattern) ?? []

    if (tokens.includes('sourceCode')) {
      const language = tokens.find((token) => token && !pandocStructuralClasses.has(token))

      if (language) {
        return language
      }
    }
  }

  // WordPress SyntaxHighlighter Evolved: class="brush: LANG; ...".
  for (const element of [pre, code]) {
    const match = element?.className.match(brushPattern)?.[1]

    if (match) {
      return match
    }
  }

  // Crayon: class="lang:LANG" or "lang_LANG".
  for (const element of [pre, code]) {
    const match = element?.className.match(crayonPattern)?.[1]

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
    const extension = figcaption?.textContent?.trim().match(filenamePattern)?.[1]

    if (extension) {
      return extension
    }
  }

  // Forem/dev.to and Pygments-style wrappers: class="highlight LANG" on the <pre>
  // or a wrapping div, where LANG is a bare class token. Accept it only when a
  // sibling token resolves to a grammar — that guard rejects the non-language
  // tokens these classes also carry (e.g. "highlight selected", "highlight line").
  for (const element of candidates) {
    const tokens = element?.className.split(whitespacePattern) ?? []

    if (tokens.includes('highlight')) {
      const language = tokens.find((token) => token !== 'highlight' && hljs.getLanguage(token))

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
    const tokens = element?.className.split(whitespacePattern) ?? []

    for (const token of tokens) {
      const language =
        token.match(githubLanguagePattern)?.[1] ?? token.match(sphinxLanguagePattern)?.[1]

      if (language && hljs.getLanguage(language)) {
        return language
      }
    }
  }
}

// Subset highlight.js auto-detection considers for blocks with no usable language
// hint (e.g. Smashing Magazine declares none). Ranked by per-feed frequency in the
// real corpus; restricting the subset keeps auto-detection cheap and stops it from
// guessing exotic grammars. All are in highlight.js's common build.
const autoDetectLanguages = [
  'bash',
  'python',
  'xml',
  'javascript',
  'cpp',
  'java',
  'json',
  'c',
  'css',
  'ruby',
  'go',
  'ini',
  'typescript',
  'sql',
  'csharp',
  'rust',
  'php',
  'markdown',
  'diff',
]

// Some grammars match loosely enough to win on plain prose/output (corpus-measured
// false-positive rates: css 38%, sql 18%, csharp 12%, python 8%, bash 6%, rust 5%).
// When auto-detection picks one of these, accept it only if a structural signature
// of the language is present — this collapses those false positives to ~0-2% while
// keeping real code. Languages absent here (html, php, json, ts, ...) are
// distinctive enough to trust unguarded.
const autoDetectSignatures: Record<string, RegExp> = {
  css: /\{[^{}]*[:;][^{}]*\}/,
  sql: /\b(?:select|insert|update|delete|create|alter|drop)\b[\s\S]*\b(?:from|into|table|set|values|where|join)\b/i,
  csharp: /\b(?:using|namespace|public|private|protected|class|void|static|var|new|string)\b/,
  python: /(?:^|\n)\s*(?:def|class|import|from|print|return|if|elif|for|while|with|try)\b/,
  bash: /(?:^|\n)\s*(?:\$|#!|sudo|apt|yum|brew|cd|ls|cat|echo|grep|curl|wget|git|npm|yarn|cp|mv|rm|mkdir|export|chmod|source|sed|awk)\b|\|\s*\w|&&/,
  rust: /\b(?:fn|let|mut|impl|use|pub|struct|enum|match|trait)\b/,
}

// highlight.js says its relevance value is not a usable confidence score
// (highlightjs/highlight.js#568) — but a result at the floor value of 1 means "no
// real signal, this language won by default", which is how ungated grammars creep
// onto prose. Requiring >= 2 drops those weak wins (cost: trivial one-liners like
// `const x = 1` stay plain).
const minAutoDetectRelevance = 2

// highlight.js resolves these to its "Plain text" grammar, which only escapes the
// text — no tokens, no real language. A block declared as one of them is left
// untouched rather than badged "Plain text", which says nothing a code block does
// not already convey.
const plaintextLanguages = new Set(['plaintext', 'text', 'txt'])

const preTag = new Set(['pre'])

// highlight.js carries a display name per grammar (getLanguage(token).name) that
// is clean for almost every language. A few come back as comma-lists or lowercase,
// so override those by token; everything else uses the hljs name, falling back to
// the raw token.
const languageLabelOverrides: Record<string, string> = {
  html: 'HTML',
  markup: 'HTML',
  xml: 'XML',
  php: 'PHP',
  ini: 'INI',
  toml: 'TOML',
}

const labelForLanguage = (language: string): string => {
  return languageLabelOverrides[language] ?? hljs.getLanguage(language)?.name ?? language
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

export const highlightCode: DomTransform = () => {
  return (document) => {
    // Some editors emit a block of code as a standalone <code> with no <pre> wrapper.
    // Promote those to <pre><code> first so the loop below treats them like any other
    // block: highlighted by a declared hint or by subset auto-detection, and rendered
    // as a block (a loose <code> renders inline, collapsing the newlines). The signal
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

      // A declared, registered language wins outright (full grammar set, including
      // the registered extras). Otherwise fall back to subset auto-detection — but
      // only for a <pre><code>: a bare <pre> is as often plain preformatted text
      // as code, so it is highlighted only when it carries an explicit hint.
      const declared = detectLanguage(pre, code)

      // A block explicitly marked as plain text is just text — leave it untouched.
      if (declared && plaintextLanguages.has(declared.toLowerCase())) {
        continue
      }

      let highlighted: string | undefined
      let language: string | undefined
      let isGuessed = false

      if (declared && hljs.getLanguage(declared)) {
        highlighted = hljs.highlight(text, { language: declared }).value
        language = declared
      } else if (code && isJsonLike(text) && isParseableJson(text)) {
        // Valid JSON is shaped like CSS to the auto-detector ({ key: value } with
        // colons), its single most common false positive. Settle it structurally:
        // an unlabeled block that actually parses as JSON is highlighted as JSON.
        // Lenient dialects (jsonc, json5) fail JSON.parse and fall through to auto-detection.
        highlighted = hljs.highlight(text, { language: 'json' }).value
        language = 'json'
      } else if (code) {
        const auto = hljs.highlightAuto(text, autoDetectLanguages)
        const signature = auto.language ? autoDetectSignatures[auto.language] : undefined

        // Accept the guess unless it is a weak default win or a loose grammar that
        // fails its structural signature.
        if (
          auto.language &&
          auto.relevance >= minAutoDetectRelevance &&
          (!signature || signature.test(text))
        ) {
          highlighted = auto.value
          language = auto.language
          isGuessed = true
        }
      }

      if (highlighted === undefined) {
        continue
      }

      target.innerHTML = highlighted
      target.classList.add('hljs')

      // Expose the resolved language for a frontend badge. The attributes stay on
      // the <pre> (kept as a static container by the wrapping pass below), so a
      // badge anchored to it stays put while the inner <code> scrolls.
      // data-pre-guessed marks a language we auto-detected rather than declared.
      if (language) {
        pre.setAttribute('data-pre-language', language)
        pre.setAttribute('data-pre-label', labelForLanguage(language))

        if (isGuessed) {
          pre.setAttribute('data-pre-guessed', '')
        }
      }
    }

    // Give every code block one structure: <pre><code>. The <pre> stays a static
    // container (a stable anchor for the language badge) and the inner <code> is
    // what scrolls. A <pre> whose only child is already a <code> is left as is.
    // A bare <pre> highlighted in place carries the hljs class, which moves onto
    // the new <code> so the theme styles the element holding the token spans.
    const presToWrap = Array.from(document.querySelectorAll('pre')).filter(
      (pre) => pre.children.length !== 1 || pre.children[0].localName !== 'code',
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
