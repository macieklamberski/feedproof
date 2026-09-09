import type { StringTransform } from '../../types.js'

const cdataStart = '<![CDATA['
const cdataEnd = ']]>'
// Only a value that is one whole block unwraps, so a CDATA marker quoted mid-text survives.
const wrapperRegex = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/

// Entity-escaped CDATA markers decode to a literal <![CDATA[ … ]]> that reads as a comment.
export const unwrapCdataMarkers: StringTransform = () => {
  return (html) => {
    const inner = wrapperRegex.exec(html)?.[1]

    if (inner === undefined) {
      return html
    }

    // Stripping the outer markers of nested or multiple blocks would splice unrelated segments.
    if (inner.includes(cdataStart) || inner.includes(cdataEnd)) {
      return html
    }

    return inner
  }
}
