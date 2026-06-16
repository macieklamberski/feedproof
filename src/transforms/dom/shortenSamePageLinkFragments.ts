import { isSamePage } from '../../common.js'
import type { DomTransform } from '../../types.js'

// The inverse of resolveRelativeUrls: once hrefs are absolute, an in-page anchor
// to the post itself (e.g. a heading permalink `https://site/post#sec`) still
// reads as a cross-page link. The downstream reader strips the page's origin
// context, so such a link navigates away instead of scrolling to its target.
// This rewrites a same-page href back to its bare `#fragment` so it stays local.
// Off-page fragment links (a different post or site) are left untouched.
export const shortenSamePageLinkFragments: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    if (!baseUrl) {
      return
    }

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

      if (isSamePage(href, baseUrl, resolveUrlFn)) {
        anchor.setAttribute('href', href.slice(hashIndex))
      }
    }
  }
}
