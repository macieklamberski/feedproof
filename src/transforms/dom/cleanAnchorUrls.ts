import type { DomTransform } from '../../types.js'

// Clean anchor hrefs with the caller-provided cleanUrlFn: unwrapping redirect
// wrappers and stripping tracking params is delegated to the injected
// function (e.g. urlpurify's cleanUrl). Skipped when no function is provided.
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
