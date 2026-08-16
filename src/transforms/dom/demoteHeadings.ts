import type { DomTransform } from '../../types.js'

const headingSelector = 'h1, h2, h3, h4, h5'

// When feed content contains an <h1>, the article body's heading hierarchy
// collides with the reader's own page-level <h1> (article title). Shift every
// heading down by one level (h1→h2, h2→h3, … , h5→h6) so the body sits below
// the reader chrome. Bodies that already start at <h2> are left alone: no
// gratuitous rewrites. <h6> stays as <h6> (no level seven to demote into;
// collisions with the demoted-from-<h5> are accepted as harmless).
export const demoteHeadings: DomTransform = () => {
  return (document) => {
    if (!document.querySelector('h1')) {
      return
    }

    const headings = document.querySelectorAll(headingSelector)

    for (const heading of headings) {
      const currentLevel = Number(heading.tagName.slice(1))
      const nextTagName = `h${currentLevel + 1}`

      const replacement = document.createElement(nextTagName)

      // linkedom yields attributes in reverse declaration order; reverse the
      // list so the serialized output matches the source ordering.
      for (const name of heading.getAttributeNames().reverse()) {
        const value = heading.getAttribute(name)
        if (value !== null) {
          replacement.setAttribute(name, value)
        }
      }

      while (heading.firstChild) {
        replacement.appendChild(heading.firstChild)
      }

      heading.replaceWith(replacement)
    }
  }
}
