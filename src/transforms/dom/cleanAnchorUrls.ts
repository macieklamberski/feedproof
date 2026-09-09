import type { DomTransform } from '../../types.js'

// Anchor hrefs as the publisher pasted them, redirect wrappers and tracking params included.
export const cleanAnchorUrls: DomTransform = (context) => {
  return (document) => {
    const cleanUrlFn = context.cleanUrlFn

    if (!cleanUrlFn) {
      return
    }

    const anchors = document.querySelectorAll('a[href]')

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href')

      if (!href) {
        continue
      }

      const cleaned = cleanUrlFn(href)

      if (cleaned !== href) {
        anchor.setAttribute('href', cleaned)
      }
    }
  }
}
