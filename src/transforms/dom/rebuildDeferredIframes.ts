import type { DomTransform } from '../../types.js'
import { isUrlShaped } from '../../utils/urls.js'
import { createIframe } from '../../utils/widgets.js'

// Some embed conventions park the real iframe URL in a `<div>` attribute and build the iframe
// with JS at runtime (Pym.js `data-pym-src`, @newswire/frames `data-frame-src`). A reader runs
// no JS, so the embed never appears. Rebuild a plain <iframe> from the parked URL for each
// configured source, so the downstream embed/media transforms see a resolvable iframe.
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
