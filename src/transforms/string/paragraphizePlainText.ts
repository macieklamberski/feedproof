import type { StringTransform } from '../../types.js'
import { isEscapedHtmlFragment } from '../../utils/html.js'

// Matches `<tag>`, `<tag …>`, `<tag />` AND `<tag/>` (XHTML self-close without
// a space before the slash, common in podcast feeds for `<br/>`). The name may carry a
// namespace prefix or a hyphen: Atom `type="xhtml"` content keeps `<xhtml:div>`, Facebook's
// pre-SDK snippet writes `<fb:post>`, and AMP and Web Components write `<amp-img>`. Missing
// those reads real markup as plain text and autop's it into a paragraph per blank line and a
// `<br />` per newline.
const hasHtmlRegex = /<[a-z][a-z0-9]*(?:[:-][a-z0-9]+)*[\s/>]/i
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

    // Content that is wholly an escaped HTML fragment (a feed generator escaped its HTML
    // twice) must reach the DOM stage as one text node so decodeDoubleEncodedTags can
    // rebuild it. Splitting it into paragraphs and line breaks here would leave only the
    // lines that happen to hold a complete tag pair decodable, and the rest would stay
    // visible as text.
    if (isEscapedHtmlFragment(html.replaceAll('&lt;', '<').replaceAll('&gt;', '>'))) {
      return html
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
