import type { DomTransform } from '../../types.js'
import { isGeneratedWrapper } from '../../utils/dom.js'

const wrapperSelectors = [
  'div',
  'article',
  'section',
  'main',
  'header',
  'footer',
  // An oEmbed block whose provider call failed leaves a figure holding nothing but the bare url.
  // jsdom rejects a `:has` nested in another `:has`, so each clause stands on its own.
  'figure:has(a):not(:has(* ~ *)):not(:has(a *)):not(:has([data-embed-provider], [data-cite-provider]))',
  // Tumblr's `tmblr-embed` and Gutenberg's `wp-block-embed` figures hold only the placeholder.
  'figure:has(> [data-embed-provider], > [data-cite-provider]):not(:has(> * ~ *))',
]

// Dissolving a wrapper exposes new matches, and the bound stops a match nothing can remove.
const maxUnwrapPasses = 10

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

// Purely presentational containers around content, which add nesting a reader cannot style.
export const unwrapWrappers: DomTransform = () => {
  return (document) => {
    const referencedFragments = collectReferencedFragments(document)

    for (let pass = 0; pass < maxUnwrapPasses; pass++) {
      const candidates = document.body.querySelectorAll(wrapperSelector)
      let unwrapped = 0

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

        // Dissolving a fragment link's target drops its id and breaks the link.
        if (id && referencedFragments.has(id)) {
          continue
        }

        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element)
        }

        element.remove()
        unwrapped++
      }

      if (unwrapped === 0) {
        return
      }
    }
  }
}
