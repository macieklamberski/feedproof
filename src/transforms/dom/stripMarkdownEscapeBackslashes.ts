import { isText } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Markdown's escape backslash leaks into some feeds' HTML as a literal `\` at the
// very start of a paragraph, which the browser then renders as stray text:
//   `<p>\</p>`        — a `\` on its own line that became a lone-backslash paragraph
//   `<p>\ Let’s say…` — a `\` leaked at the start of a paragraph's text
// Only a paragraph-leading backslash is touched. A `\` mid-text or before a <br>
// is left alone: there it is overwhelmingly real content (Windows paths ending in
// `\`, shell line continuations, LaTeX), not the markdown leak.
//
// Leading whitespace, then a lone `\` that is the paragraph's content or is
// followed by whitespace. The `(?=\s|$)` lookahead excludes `\(`, `\textbf`,
// `\n`, `\/` and other real escapes/code where the backslash trails a non-space.
const leadingBlockBackslash = /^(\s*)\\(?=\s|$)/

export const stripMarkdownEscapeBackslashes: DomTransform = () => {
  return (document) => {
    // A lone-backslash paragraph (`<p>\</p>`) is emptied here and removed later by
    // stripEmptyTags; a leading `\` (`<p>\ text`) just loses the backslash.
    for (const block of document.querySelectorAll('p')) {
      const first = block.firstChild

      if (isText(first)) {
        const match = first.data.match(leadingBlockBackslash)

        if (match) {
          const backslashIndex = match[1].length
          first.data = first.data.slice(0, backslashIndex) + first.data.slice(backslashIndex + 1)
        }
      }
    }
  }
}
