import hljs from 'highlight.js/lib/common'
import type { DomTransform } from '../../types.js'

const languagePattern = /(?:language|lang)-(\S+)/
const languageAttributes = ['data-language', 'data-lang']

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
}

export const highlightCode: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      const code = pre.querySelector('code')

      if (!code) {
        continue
      }

      const text = code.textContent ?? ''

      if (!text.trim()) {
        continue
      }

      const language = detectLanguage(pre, code)
      const result =
        language && hljs.getLanguage(language)
          ? hljs.highlight(text, { language })
          : hljs.highlightAuto(text)

      code.innerHTML = result.value
      code.classList.add('hljs')
    }
  }
}
