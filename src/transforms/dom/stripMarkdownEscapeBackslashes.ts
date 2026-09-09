import type { DomTransform } from '../../types.js'
import { isText } from '../../utils/dom.js'

// The lookahead keeps `\(`, `\textbf` and `\n` at a paragraph start, which are real content.
const leadingBlockBackslash = /^(\s*)\\(?=\s|$)/

// Markdown's escape backslash leaked to the start of a paragraph, where it renders as a stray `\`.
// One mid-text or before a <br> is real content: a Windows path, a shell continuation, LaTeX.
export const stripMarkdownEscapeBackslashes: DomTransform = () => {
  return (document) => {
    // A lone-backslash paragraph (`<p>\</p>`) is emptied here and removed later by
    // stripEmptyTags. A leading `\` (`<p>\ text`) just loses the backslash.
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
