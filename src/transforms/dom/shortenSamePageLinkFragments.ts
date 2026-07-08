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

// The inverse of resolveRelativeUrls: once hrefs are absolute, an in-page anchor
// to the post itself (e.g. a heading permalink `https://site/post#sec`) still
// reads as a cross-page link. The downstream reader strips the page's origin
// context, so such a link navigates away instead of scrolling to its target.
// This rewrites a same-page href back to its bare `#fragment` so it stays local.
// Off-page fragment links (a different post or site) are left untouched.
//
// A link on the item's own page (`baseUrl`) is always shortened. Some feeds,
// notably HTML-to-Atom bridges, instead absolutize in-page fragments against the
// feed's site or feed page (`sameSiteUrls`) rather than the item permalink; those
// are shortened only when the fragment names a target that exists in this content,
// so genuine links to another of the site's pages, and self-consistent third-party
// embeds, are left alone.
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

      // Already local, or not an in-page anchor at all.
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

      // A fragment on one of the item's other pages counts as in-page only when
      // its target is actually present in the content.
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
