import type { StringTransform } from '../../types.js'
import { isEscapedHtmlFragment } from '../../utils/html.js'

// Matches <tag>, <tag …>, <tag /> and <tag/>, the name with a namespace prefix or a hyphen.
// Atom xhtml content keeps <xhtml:div> and AMP writes <amp-img>, which otherwise read as text.
// Podcast feeds write <br/> with no space before the slash.
const hasHtmlRegex = /<[a-z][a-z0-9]*(?:[:-][a-z0-9]+)*[\s/>]/i
const carriageReturnRegex = /\r\n|\r/g
const paragraphSeparatorRegex = /\n\s*\n/
const edgeNewlinesRegex = /^\n+|\n+$/g
const lineBreakRegex = /[ \t]*\n/g

// Plain-text content with no tags, whose newlines and blank lines collapse when rendered as HTML.
export const paragraphizePlainText: StringTransform = () => {
  return (html) => {
    if (hasHtmlRegex.test(html)) {
      return html
    }

    if (!html.trim()) {
      return ''
    }

    // Paragraphizing an escaped fragment leaves only the lines holding a full tag pair decodable.
    // A generator that escaped its HTML twice ships the whole body as one escaped fragment.
    if (isEscapedHtmlFragment(html.replaceAll('&lt;', '<').replaceAll('&gt;', '>'))) {
      return html
    }

    // The appended newline is deliberate.
    // Without it, end-of-text whitespace becomes a trailing <br /> in the last paragraph.
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
