import type { DomTransform } from '../../types.js'
import { isComment, isElement, isWhitespaceText } from '../../utils/dom.js'

const headingSelector = 'h1, h2, h3, h4, h5, h6'
const boldTags = new Set(['b', 'strong'])

// Returns the heading's only meaningful child (ignoring whitespace and comments)
// when that child is an element, else null.
const soleContentElement = (heading: Element): Element | null => {
  let found: Element | null = null

  for (const child of heading.childNodes) {
    if (isWhitespaceText(child) || isComment(child)) {
      continue
    }

    if (found || !isElement(child)) {
      return null
    }

    found = child
  }

  return found
}

// Unwraps a <b>/<strong> that wraps a heading's entire content. Headings are
// already bold via styling, so the inner bold is redundant. Stacked wrappers
// collapse in a single pass.
export const unwrapHeadingBold: DomTransform = () => {
  return (document) => {
    const headings = document.querySelectorAll(headingSelector)

    for (const heading of headings) {
      let bold = soleContentElement(heading)

      while (bold && boldTags.has(bold.localName)) {
        while (bold.firstChild) {
          heading.insertBefore(bold.firstChild, bold)
        }

        bold.remove()
        bold = soleContentElement(heading)
      }
    }
  }
}
