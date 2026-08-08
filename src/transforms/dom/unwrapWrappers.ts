import type { DomTransform } from '../../types.js'
import { isGeneratedWrapper } from '../../utils/dom.js'

const wrapperSelectors = [
  'div',
  'article',
  'section',
  'main',
  'header',
  'footer',
  // A figure reduced to one text-only link, what an oEmbed block leaves when the provider call
  // failed and linkifyUrls has since turned its bare url into an anchor: no element inside has a
  // sibling (the content is one chain), that chain ends in a leaf anchor, and no placeholder sits
  // in it. jsdom rejects a `:has` nested in another, so each stands on its own.
  'figure:has(a):not(:has(* ~ *)):not(:has(a *)):not(:has([data-embed-provider], [data-cite-provider]))',
]

const wrapperSelector = wrapperSelectors.join(', ')

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
// Containers carrying `data-embed-*`, `data-cite-*`, `data-gallery-*`, `data-table`, or
// `data-pre` attributes (feedsweep's own markers) are preserved, as are ones whose
// id is the target of an in-page fragment link (unwrapping would drop the id and
// break the link). Must run AFTER merge transforms so unwrapping doesn't expose new
// adjacent siblings for those to merge.
export const unwrapWrappers: DomTransform = () => {
  return (document) => {
    const referencedFragments = collectReferencedFragments(document)
    const candidates = document.body.querySelectorAll(wrapperSelector)

    for (let i = 0, n = candidates.length; i < n; i++) {
      const element = candidates[i]
      const parent = element.parentNode

      if (!parent) {
        continue
      }

      if (isGeneratedWrapper(element)) {
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
