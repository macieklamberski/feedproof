import type { StringTransform } from '../../types.js'

// Some feeds entity-escape the CDATA markers themselves, sending
// `&lt;![CDATA[ … ]]&gt;` instead of a real CDATA section. After XML decoding the
// whole value becomes the literal text `<![CDATA[ … ]]>`. Left as-is, the
// comment/markup-stripping pass erases it (the markers read as a bogus comment),
// so the article body or summary disappears.
//
// Unlike unwrapCdataComments, this only unwraps when a single block makes up the
// entire value. A bare `<![CDATA[` in the middle of content is a legitimate
// example (e.g. an XML tutorial) and must survive verbatim.
//
// The wrapper regex is anchored at both ends so a non-match bails at the start,
// without scanning or copying the whole string.
const cdataStart = '<![CDATA['
const cdataEnd = ']]>'
const wrapperRegex = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/

export const unwrapCdataMarkers: StringTransform = () => {
  return (html) => {
    const inner = wrapperRegex.exec(html)?.[1]

    if (inner === undefined) {
      return html
    }

    // Bail on multiple or nested blocks, where stripping the outer markers would
    // splice unrelated segments together.
    if (inner.includes(cdataStart) || inner.includes(cdataEnd)) {
      return html
    }

    return inner
  }
}
