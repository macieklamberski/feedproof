import type { DomTransform } from '../types.js'

// Trims trailing whitespace and removes common leading indentation from <pre> blocks.
// Feeds sometimes indent code to match surrounding HTML, adding unwanted whitespace.
const trailingWhitespaceRegex = /\s+$/
const leadingBlankLinesRegex = /^(\s*\n)+/
const leadingIndentRegex = /^([^\S\n]+)/

export const trimPreWhitespace: DomTransform = () => {
  return (document) => {
    for (const pre of document.querySelectorAll('pre')) {
      const target = pre.querySelector('code') ?? pre
      const trimmed = target.innerHTML
        .replace(trailingWhitespaceRegex, '')
        .replace(leadingBlankLinesRegex, '')
      const lines = trimmed.split('\n')

      // Find the smallest non-zero indentation across all non-empty lines.
      const indents = lines
        .filter((line) => line.trim().length > 0)
        .map((line) => line.match(leadingIndentRegex)?.[1].length ?? 0)

      const common = Math.min(...indents)

      if (common > 0) {
        target.innerHTML = lines.map((line) => line.slice(common)).join('\n')
      } else {
        target.innerHTML = trimmed
      }
    }
  }
}
