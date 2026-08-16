import type { DomTransform } from '../../types.js'
import { isText } from '../../utils/dom.js'

// Trims trailing whitespace and removes common leading indentation from <pre> blocks.
// Feeds sometimes indent code to match surrounding HTML, adding unwanted whitespace.
const trailingWhitespaceRegex = /\s+$/
const leadingBlankLinesRegex = /^(\s*\n)+/

// A line's indentation can sit behind leading inline tags: some highlighters wrap
// each line in its own <span> with the indent inside it, and can be written with
// non-breaking-space entities instead of literal spaces. Skip the leading tags,
// then read the indent one "unit" at a time: a literal whitespace char or a single
// nbsp entity, each worth one column. innerHTML serializes U+00A0 as an entity, so
// a plain whitespace regex on the markup never sees it otherwise.
const leadingTagsRegex = /^(?:<[^>]*>)*/
const indentUnitRegex = /^(?:[^\S\n]|&nbsp;|&#160;|&#xa0;)/i

type LineIndent = { tags: string; units: Array<string>; rest: string }

const splitIndent = (line: string): LineIndent => {
  const tags = line.match(leadingTagsRegex)?.[0] ?? ''
  let rest = line.slice(tags.length)
  const units: Array<string> = []

  for (;;) {
    const unit = rest.match(indentUnitRegex)?.[0]

    if (!unit) {
      break
    }

    units.push(unit)
    rest = rest.slice(unit.length)
  }

  return { tags, units, rest }
}

export const trimPreWhitespace: DomTransform = () => {
  return (document) => {
    for (const pre of document.querySelectorAll('pre')) {
      const target = pre.querySelector('code') ?? pre
      const original = target.innerHTML
      const trimmed = original
        .replace(trailingWhitespaceRegex, '')
        .replace(leadingBlankLinesRegex, '')

      // Smallest indentation across content lines, computed in a single pass that
      // bails at column zero: the common case once highlighting has wrapped lines
      // in <span>s with no shared indent. A line that is only tags and whitespace
      // (e.g. an empty line <span>) carries no content, so it neither counts nor
      // forces the common indent to zero.
      let common = Number.POSITIVE_INFINITY

      for (const line of trimmed.split('\n')) {
        const { units, rest } = splitIndent(line)

        if (rest.length === 0) {
          continue
        }

        if (units.length < common) {
          common = units.length
        }

        if (common === 0) {
          break
        }
      }

      // De-indentation rewrites every line, so fall back to the innerHTML
      // round-trip. This is rare: highlighted code starts lines with <span> and a
      // token, so the common indent is usually zero.
      if (common > 0 && common !== Number.POSITIVE_INFINITY) {
        const result = trimmed
          .split('\n')
          .map((line) => {
            const { tags, units, rest } = splitIndent(line)
            return tags + units.slice(common).join('') + rest
          })
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
      // corrupt code samples, and the round-trip dominates the cost on large
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
