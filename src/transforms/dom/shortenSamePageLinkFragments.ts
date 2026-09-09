import type { DomTransform } from '../../types.js'
import { isSamePage } from '../../utils/urls.js'

// The fragments an in-page link can resolve to: element ids plus legacy
// `<a name>` anchors.
const collectFragmentTargets = (document: Document): Set<string> => {
  const targets = new Set<string>()

  for (const element of document.querySelectorAll('[id]')) {
    const id = element.getAttribute('id')

    if (id) {
      targets.add(id)
    }
  }

  for (const element of document.querySelectorAll('a[name]')) {
    const name = element.getAttribute('name')

    if (name) {
      targets.add(name)
    }
  }

  return targets
}

// An in-page anchor absolutised to its own post reads as a cross-page link and navigates away.
export const shortenSamePageLinkFragments: DomTransform = ({
  baseUrl,
  sameSiteUrls = [],
  resolveUrlFn,
}) => {
  return (document) => {
    const otherSelfUrls = sameSiteUrls.filter((url) => url && url !== baseUrl)

    if (!baseUrl && otherSelfUrls.length === 0) {
      return
    }

    // Built lazily on the first cross-self-page candidate, so items without one
    // never pay for the DOM scan.
    let targetFragments: Set<string> | undefined

    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href')

      if (!href || href.startsWith('#')) {
        continue
      }

      const hashIndex = href.indexOf('#')

      if (hashIndex === -1) {
        continue
      }

      // A fragment on the item's own page is always an in-page anchor.
      if (baseUrl && isSamePage(href, baseUrl, resolveUrlFn)) {
        anchor.setAttribute('href', href.slice(hashIndex))
        continue
      }

      // Shortening a same-site link with no target in the content kills a link to another page.
      // HTML-to-Atom bridges absolutise in-page fragments against the feed page, not the post.
      if (otherSelfUrls.length === 0) {
        continue
      }

      targetFragments ??= collectFragmentTargets(document)

      if (!targetFragments.has(href.slice(hashIndex + 1))) {
        continue
      }

      for (const selfUrl of otherSelfUrls) {
        if (isSamePage(href, selfUrl, resolveUrlFn)) {
          anchor.setAttribute('href', href.slice(hashIndex))
          break
        }
      }
    }
  }
}
