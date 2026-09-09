import type { DomTransform } from '../../types.js'
import { isUrlShaped } from '../../utils/urls.js'
import { createIframe } from '../../utils/widgets.js'

// Pym.js and @newswire/frames park the iframe url on a div attribute and build the iframe with JS.
export const rebuildDeferredIframes: DomTransform =
  ({ deferredIframeSources }) =>
  (document) => {
    for (const { selector, attribute } of deferredIframeSources) {
      for (const element of document.querySelectorAll(selector)) {
        const src = element.getAttribute(attribute)

        if (!src || !isUrlShaped(src)) {
          continue
        }

        const iframe = createIframe(document, src)
        element.replaceWith(iframe)
      }
    }
  }
