import type { DomTransform } from '../../types.js'

const wrapperTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

const preservedPrefixes = ['data-embed', 'data-bookmark', 'data-gallery', 'data-table', 'data-pre']

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

// Collects the ids that in-page anchors (`<a href="#id">`) point at, so wrappers
// that are those anchors' scroll targets (e.g. a `<div class="footnote-definition"
// id="1">`) are not dissolved along with their id.
const collectReferencedFragments = (document: Document): Set<string> => {
  const fragments = new Set<string>()

  for (const anchor of document.querySelectorAll('a[href^="#"]')) {
    const href = anchor.getAttribute('href')

    if (href && href.length > 1) {
      fragments.add(href.slice(1))
    }
  }

  return fragments
}

// Removes purely presentational container tags. Children are hoisted in place.
// Containers carrying `data-embed-*`, `data-bookmark-*`, `data-gallery-*`, `data-table`,
// or `data-pre` attributes (feedsweep's own placeholders/markers) are preserved, as are
// ones whose id is the target of an in-page fragment link (unwrapping would drop the id and
// break the link). Must run AFTER merge transforms so unwrapping doesn't expose new
// adjacent siblings for those to merge.
export const unwrapWrappers: DomTransform = () => {
  return (document) => {
    const referencedFragments = collectReferencedFragments(document)
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

      const id = element.getAttribute('id')

      if (id && referencedFragments.has(id)) {
        continue
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }

      element.remove()
    }
  }
}
