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

export const detectLanguage = (pre: Element, code: Element | null): string | undefined => {
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

export const highlightCode: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      const code = pre.querySelector('code')

      if (!code) {
        continue
      }

      // Highlight only when the block declares a language highlight.js knows.
      // No usable hint (no class, lang-auto, an unsupported token, ...) is left
      // as plain text instead of guessed at, which mis-colors prose and output.
      const language = detectLanguage(pre, code)

      if (!language || !hljs.getLanguage(language)) {
        continue
      }

      const text = code.textContent

      if (!text?.trim()) {
        continue
      }

      code.innerHTML = hljs.highlight(text, { language }).value
      code.classList.add('hljs')
    }
  }
}
