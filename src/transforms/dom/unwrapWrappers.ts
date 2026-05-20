import type { DomTransform } from '../../types.js'

const wrapperTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

const hasEmbedAttribute = (element: Element): boolean => {
  const attributes = element.attributes
  for (let i = 0, n = attributes.length; i < n; i++) {
    if (attributes[i].name.startsWith('data-embed')) {
      return true
    }
  }
  return false
}

// Removes purely presentational container tags. Children are hoisted in place.
// Containers carrying `data-embed-*` attributes (feedsweep's own embed
// placeholders) are preserved. Must run AFTER merge transforms so unwrapping
// doesn't expose new adjacent siblings for those to merge.
export const unwrapWrappers: DomTransform = () => {
  return (document) => {
    const candidates = document.body.querySelectorAll('*')

    for (let i = 0, n = candidates.length; i < n; i++) {
      const element = candidates[i]

      if (!wrapperTags.has(element.localName)) {
        continue
      }

      const parent = element.parentNode

      if (!parent) {
        continue
      }

      if (hasEmbedAttribute(element)) {
        continue
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }

      element.remove()
    }
  }
}
