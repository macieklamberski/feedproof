import type { DomTransform } from '../../types.js'
import { isGeneratedWrapper } from '../../utils/dom.js'

const wrapperTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

// The tags a figure may hold and still be nothing but a link: an oEmbed block whose provider
// call failed keeps its `<figure>` shell around the bare url, which linkifyUrls has turned into
// an anchor by the time this runs. Anything else inside (an image, a placeholder, a caption)
// makes it a real figure.
const linkOnlyFigureTags = new Set(['p', 'div', 'span', 'a'])

const isLinkOnlyFigure = (element: Element): boolean => {
  const anchors = element.querySelectorAll('a')

  if (anchors.length !== 1) {
    return false
  }

  for (const descendant of element.querySelectorAll('*')) {
    if (!linkOnlyFigureTags.has(descendant.localName) || isGeneratedWrapper(descendant)) {
      return false
    }
  }

  return true
}

const isWrapper = (element: Element): boolean => {
  return element.localName === 'figure'
    ? isLinkOnlyFigure(element)
    : wrapperTags.has(element.localName)
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
// Containers carrying `data-embed-*`, `data-cite-*`, `data-table`, or
// `data-pre` attributes (feedsweep's own markers) are preserved, as are ones whose
// id is the target of an in-page fragment link (unwrapping would drop the id and
// break the link). Must run AFTER merge transforms so unwrapping doesn't expose new
// adjacent siblings for those to merge.
export const unwrapWrappers: DomTransform = () => {
  return (document) => {
    const referencedFragments = collectReferencedFragments(document)
    const candidates = document.body.querySelectorAll('*')

    for (let i = 0, n = candidates.length; i < n; i++) {
      const element = candidates[i]

      if (!isWrapper(element)) {
        continue
      }

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
