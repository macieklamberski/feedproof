import type { DomTransform } from '../../types.js'
import { isText } from '../../utils/dom.js'

const trailingWhitespaceRegex = /\s+$/
const leadingBlankLinesRegex = /^(\s*\n)+/

// innerHTML serializes U+00A0 as an entity, so `\s` alone never sees an nbsp indent.
// Some highlighters wrap each line in a <span> with the indent inside it, as nbsp entities.
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

// A <pre> indented to match the surrounding HTML, which renders the indent as part of the code.
export const trimPreWhitespace: DomTransform = () => {
  return (document) => {
    for (const pre of document.querySelectorAll('pre')) {
      const target = pre.querySelector('code') ?? pre
      const original = target.innerHTML
      const trimmed = original
        .replace(trailingWhitespaceRegex, '')
        .replace(leadingBlankLinesRegex, '')

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

      // Writing innerHTML re-parses the block, which for a <pre> holding <xmp> or another linkedom
      // raw-text element can re-escape entities and corrupt the code sample.
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
