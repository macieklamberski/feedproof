import type { DomTransform } from '../../types.js'

// Trims trailing whitespace and removes common leading indentation from <pre> blocks.
// Feeds sometimes indent code to match surrounding HTML, adding unwanted whitespace.
const trailingWhitespaceRegex = /\s+$/
const leadingBlankLinesRegex = /^(\s*\n)+/
const leadingIndentRegex = /^([^\S\n]+)/

export const trimPreWhitespace: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      const target = pre.querySelector('code') ?? pre
      const original = target.innerHTML
      const trimmed = original
        .replace(trailingWhitespaceRegex, '')
        .replace(leadingBlankLinesRegex, '')
      const lines = trimmed.split('\n')

      // Find the smallest non-zero indentation across all non-empty lines.
      const indents = lines
        .filter((line) => line.trim().length > 0)
        .map((line) => line.match(leadingIndentRegex)?.[1].length ?? 0)

      const common = Math.min(...indents)
      const result = common > 0 ? lines.map((line) => line.slice(common)).join('\n') : trimmed

      // Skip the innerHTML write when the content hasn't changed. The write
      // is not free: it triggers a parse + serialize round-trip that, for
      // <pre> containing <xmp> or other raw-text quirks of linkedom, can
      // re-escape entities and corrupt code samples. Most fires of this
      // transform produce no actual change, so skipping is a big win.
      if (result !== original) {
        target.innerHTML = result
      }
    }
  }
}
