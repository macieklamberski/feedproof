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
import { hasAncestorWithTagName } from '../../common.js'
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
const languageAttributes = ['data-language', 'data-lang']
const brushPattern = /brush:\s*([\w#+-]+)/
const crayonPattern = /\blang[:_]([\w#+-]+)/
const whitespacePattern = /\s+/
// Pandoc emits class="sourceCode LANG"; these tokens are structural, not the language.
const pandocStructuralClasses = new Set(['sourceCode', 'numberLines'])

export const detectLanguage = (pre: Element | null, code: Element | null): string | undefined => {
  // Check language-* / lang-* class on <code>, then <pre>.
  for (const element of [code, pre]) {
    const match = element?.className.match(languagePattern)?.[1]

    if (match) {
      return match
    }
  }

  // Check data-language / data-lang on <pre>, then <code>.
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

const preTag = new Set(['pre'])

export const highlightCode: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      // A <pre> usually wraps a <code>, but some editors put the code directly in
      // the <pre> with the language hint on the <pre> itself. Highlight the <code>
      // when present, otherwise the <pre> itself.
      const code = pre.querySelector('code')
      const target = code ?? pre

      const text = target.textContent

      if (!text?.trim()) {
        continue
      }

      // A declared, registered language wins outright (full grammar set, including
      // the registered extras). Otherwise fall back to subset auto-detection — but
      // only for a <pre><code>: a bare <pre> is as often plain preformatted text
      // as code, so it is highlighted only when it carries an explicit hint.
      const declared = detectLanguage(pre, code)
      let highlighted: string | undefined

      if (declared && hljs.getLanguage(declared)) {
        highlighted = hljs.highlight(text, { language: declared }).value
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
        }
      }

      if (highlighted === undefined) {
        continue
      }

      target.innerHTML = highlighted
      target.classList.add('hljs')
    }

    // Some editors emit a block of code as a standalone <code> with no <pre>
    // wrapper, the language hint on the <code> itself. Highlight those too, but
    // only when they carry a registered hint and span multiple lines — enough to
    // tell block code from the far more common inline <code>, with no guessing.
    for (const code of document.querySelectorAll('code')) {
      if (hasAncestorWithTagName(code, preTag)) {
        continue
      }

      const text = code.textContent

      if (!text?.includes('\n')) {
        continue
      }

      const declared = detectLanguage(null, code)

      if (!declared || !hljs.getLanguage(declared)) {
        continue
      }

      code.innerHTML = hljs.highlight(text, { language: declared }).value
      code.classList.add('hljs')
    }
  }
}
