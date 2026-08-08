import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

// Invision Community points a deferred embed's src at the forum's own blank interface page
// and parks the real URL in `data-embed-src`, so that src is a placeholder, not content.
const placeholderPageRegex = /\/applications\/core\/interface\/index\.html(?:[?#]|$)/

// Promote a lazy/consent-gated iframe src (the real embed URL parked in a data-*
// attribute) into `src` when the src itself is empty or `about:blank`, so the
// downstream embed transform sees a resolvable iframe. Mirrors fixLazyImages.
export const fixLazyIframes: DomTransform = (context) => {
  const { lazyIframeAttributes } = context

  return (document) => {
    for (const iframe of document.querySelectorAll('iframe')) {
      const src = iframe.getAttribute('src')

      if (isUsableSrc(src) && !placeholderPageRegex.test(src)) {
        continue
      }

      for (const attribute of lazyIframeAttributes) {
        const value = iframe.getAttribute(attribute)

        if (value && isUrlShaped(value)) {
          iframe.setAttribute('src', value)
          break
        }
      }
    }
  }
}
