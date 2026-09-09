import type { DomTransform } from '../../types.js'

// A body starting at <h1>, which collides with the reader's own page-level title heading.
export const demoteHeadings: DomTransform = () => {
  return (document) => {
    if (!document.querySelector('h1')) {
      return
    }

    const headings = document.querySelectorAll('h1, h2, h3, h4, h5')

    for (const heading of headings) {
      const currentLevel = Number(heading.tagName.slice(1))
      const nextTagName = `h${currentLevel + 1}`

      const replacement = document.createElement(nextTagName)

      for (const name of heading.getAttributeNames()) {
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
