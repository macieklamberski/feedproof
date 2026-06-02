import { isText } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Trims trailing whitespace and removes common leading indentation from <pre> blocks.
// Feeds sometimes indent code to match surrounding HTML, adding unwanted whitespace.
const trailingWhitespaceRegex = /\s+$/
const leadingBlankLinesRegex = /^(\s*\n)+/
const leadingIndentRegex = /^([^\S\n]+)/

export const trimPreWhitespace: DomTransform = () => {
  return (document) => {
    for (const pre of document.querySelectorAll('pre')) {
      const target = pre.querySelector('code') ?? pre
      const original = target.innerHTML
      const trimmed = original
        .replace(trailingWhitespaceRegex, '')
        .replace(leadingBlankLinesRegex, '')

      // Smallest indentation across non-empty lines, computed in a single pass
      // that bails at column zero — the common case once highlighting has
      // wrapped lines in <span>s. Avoids the intermediate arrays and the
      // `Math.min(...indents)` spread, which overflows the stack on blocks
      // with very many lines.
      let common = Number.POSITIVE_INFINITY

      for (const line of trimmed.split('\n')) {
        if (line.trim().length === 0) {
          continue
        }

        const indent = line.match(leadingIndentRegex)?.[1].length ?? 0

        if (indent < common) {
          common = indent
        }

        if (common === 0) {
          break
        }
      }

      // De-indentation rewrites every line, so fall back to the innerHTML
      // round-trip. This is rare: highlighted code starts lines with <span>,
      // so the common indent is usually zero.
      if (common > 0 && common !== Number.POSITIVE_INFINITY) {
        const result = trimmed
          .split('\n')
          .map((line) => line.slice(common))
          .join('\n')

        if (result !== original) {
          target.innerHTML = result
        }

        continue
      }

      if (trimmed === original) {
        continue
      }

      // Only leading/trailing whitespace changed, which lives in the boundary
      // text nodes. Edit those in place instead of writing innerHTML: the write
      // triggers a parse + serialize round-trip that, for <pre> containing
      // <xmp> or other raw-text quirks of linkedom, can re-escape entities and
      // corrupt code samples — and the round-trip dominates the cost on large
      // blocks.
      const lastChild = target.lastChild

      if (isText(lastChild)) {
        lastChild.data = lastChild.data.replace(trailingWhitespaceRegex, '')
      }

      const firstChild = target.firstChild

      if (isText(firstChild)) {
        firstChild.data = firstChild.data.replace(leadingBlankLinesRegex, '')
      }
    }
  }
}
