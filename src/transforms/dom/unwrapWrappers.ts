import type { DomTransform } from '../../types.js'
import { isGeneratedWrapper } from '../../utils/dom.js'

// A figure reduced to one text-only link: an oEmbed block whose provider call failed keeps its
// `<figure>` shell around the bare url, which linkifyUrls has turned into an anchor by the time
// this runs. The clauses read as: the anchor hangs off the figure through at most two wrapper
// tags, no element inside has an element sibling (so the content is one chain), the anchor
// holds no element (so a linked image stays a figure), and no placeholder sits in the chain.
// Every `:has` stands on its own because jsdom rejects one nested in another, and the wrapper
// tags are spelled as positive chains because jsdom misreads `:has(:not(div, p, span, a))`
// once the figure itself has a parent wrapper.
const linkWrapper = ':is(div, p, span)'
const linkOnlyFigureSelector = [
  `figure:is(:has(> a), :has(> ${linkWrapper} > a), :has(> ${linkWrapper} > ${linkWrapper} > a))`,
  ':not(:has(* ~ *))',
  ':not(:has(a *))',
  ':not(:has([data-embed-provider], [data-cite-provider]))',
].join('')

const wrapperSelectors = [
  'div',
  'article',
  'section',
  'main',
  'header',
  'footer',
  linkOnlyFigureSelector,
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
// Containers carrying `data-embed-*`, `data-cite-*`, `data-table`, or
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
