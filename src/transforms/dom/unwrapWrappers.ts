import type { DomTransform } from '../../types.js'

const wrapperTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

const preservedPrefixes = ['data-embed', 'data-bookmark']

const hasPreservedAttribute = (element: Element): boolean => {
  const attributes = element.attributes
  for (let i = 0, n = attributes.length; i < n; i++) {
    const name = attributes[i].name
    for (const prefix of preservedPrefixes) {
      if (name.startsWith(prefix)) {
        return true
      }
    }
  }
  return false
}

// Removes purely presentational container tags. Children are hoisted in place.
// Containers carrying `data-embed-*` or `data-bookmark-*` attributes
// (feedsweep's own placeholders) are preserved. Must run AFTER merge transforms
// so unwrapping doesn't expose new adjacent siblings for those to merge.
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

      if (hasPreservedAttribute(element)) {
        continue
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }

      element.remove()
    }
  }
}
