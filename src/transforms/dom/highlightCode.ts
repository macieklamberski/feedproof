import type { LanguageFn } from 'highlight.js'
import hljs from 'highlight.js/lib/common'
import clojure from 'highlight.js/lib/languages/clojure'
import cmake from 'highlight.js/lib/languages/cmake'
import dart from 'highlight.js/lib/languages/dart'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import elixir from 'highlight.js/lib/languages/elixir'
import elm from 'highlight.js/lib/languages/elm'
import erlang from 'highlight.js/lib/languages/erlang'
import fsharp from 'highlight.js/lib/languages/fsharp'
import glsl from 'highlight.js/lib/languages/glsl'
import groovy from 'highlight.js/lib/languages/groovy'
import haskell from 'highlight.js/lib/languages/haskell'
import http from 'highlight.js/lib/languages/http'
import julia from 'highlight.js/lib/languages/julia'
import latex from 'highlight.js/lib/languages/latex'
import lisp from 'highlight.js/lib/languages/lisp'
import matlab from 'highlight.js/lib/languages/matlab'
import nginx from 'highlight.js/lib/languages/nginx'
import nix from 'highlight.js/lib/languages/nix'
import ocaml from 'highlight.js/lib/languages/ocaml'
import powershell from 'highlight.js/lib/languages/powershell'
import scala from 'highlight.js/lib/languages/scala'
import scheme from 'highlight.js/lib/languages/scheme'
import twig from 'highlight.js/lib/languages/twig'
import verilog from 'highlight.js/lib/languages/verilog'
import vim from 'highlight.js/lib/languages/vim'
import type { DomTransform } from '../../types.js'

// Languages absent from highlight.js's common build but common in feed code
// blocks (ranked by real-corpus hint frequency). Registering them lets an
// explicit class/attribute hint resolve to a single fast, correct grammar
// instead of falling through to the expensive auto-detect path. Built-in
// aliases (hs->haskell, clj->clojure, ...) come along for free.
const extraLanguages: Record<string, LanguageFn> = {
  clojure,
  cmake,
  dart,
  dockerfile,
  elixir,
  elm,
  erlang,
  fsharp,
  glsl,
  groovy,
  haskell,
  http,
  julia,
  latex,
  lisp,
  matlab,
  nginx,
  nix,
  ocaml,
  powershell,
  scala,
  scheme,
  twig,
  verilog,
  vim,
}

for (const [name, grammar] of Object.entries(extraLanguages)) {
  hljs.registerLanguage(name, grammar)
}

// Candidate set for auto-detecting UNLABELED blocks — the dominant cost, since
// most feed code carries no usable hint. These are the most frequent grammars
// across the real-feed corpus, restricted to the cheap common build:
// `highlightAuto` scores every candidate, so the set is kept small (faster than
// the full common build) and deliberately EXCLUDES the registered
// `extraLanguages` — those grammars are individually expensive and unlabeled
// blocks are rarely written in them, so including them is a net loss. Distinct
// from `extraLanguages`: that resolves explicit hints, this guesses bare blocks.
const autoDetectLanguages = [
  'bash',
  'javascript',
  'python',
  'shell',
  'java',
  'xml',
  'rust',
  'r',
  'cpp',
  'yaml',
  'typescript',
  'c',
  'ruby',
  'go',
  'css',
  'csharp',
  'sql',
  'json',
  'swift',
  'php',
  'markdown',
  'kotlin',
  'ini',
  'diff',
  'lua',
]

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

      const language = detectLanguage(pre, code)

      // Auto-detection is the hot path; skip blocks that already carry
      // highlight markup (Shiki/Prism/Pygments) when we have no language
      // hint to re-highlight against — running highlightAuto would just
      // destroy the existing structure for marginal benefit. Checking
      // `children.length` before reading `textContent` avoids the string
      // allocation for the (often large) blocks we end up skipping.
      if (!language && code.children.length > 0) {
        continue
      }

      const text = code.textContent

      if (!text?.trim()) {
        continue
      }

      const result =
        language && hljs.getLanguage(language)
          ? hljs.highlight(text, { language })
          : hljs.highlightAuto(text, autoDetectLanguages)

      code.innerHTML = result.value
      code.classList.add('hljs')
    }
  }
}
