import type { StringTransform } from '../../types.js'

// Matches `<tag>`, `<tag …>`, `<tag />` AND `<tag/>` (XHTML self-close without
// a space before the slash, common in podcast feeds for `<br/>`).
const hasHtmlRegex = /<[a-z][a-z0-9]*[\s/>]/i
const carriageReturnRegex = /\r\n|\r/g
const paragraphSeparatorRegex = /\n\s*\n/
const edgeNewlinesRegex = /^\n+|\n+$/g
const lineBreakRegex = /[ \t]*\n/g

// Plain-text subset of WordPress autop semantics: double newlines split
// paragraphs, single newlines become <br />. The HTML-aware parts of autop are
// owned by the DOM transforms (convertBreaksToParagraphs,
// wrapBareInlineInParagraphs), so anything containing a tag passes through.
export const paragraphizePlainText: StringTransform = () => {
  return (html) => {
    if (hasHtmlRegex.test(html)) {
      return html
    }

    if (!html.trim()) {
      return ''
    }

    // The appended newline mirrors autop: it turns end-of-text whitespace into
    // its own (dropped) chunk instead of an inline break.
    const chunks = `${html.replace(carriageReturnRegex, '\n')}\n`.split(paragraphSeparatorRegex)
    const paragraphs: Array<string> = []

    for (const chunk of chunks) {
      const piece = chunk.replace(edgeNewlinesRegex, '')

      if (!piece.trim()) {
        continue
      }

      paragraphs.push(`<p>${piece.replace(lineBreakRegex, '<br />\n')}</p>\n`)
    }

    return paragraphs.join('')
  }
}
