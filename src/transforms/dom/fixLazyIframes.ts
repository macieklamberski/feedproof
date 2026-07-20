import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

// Promote a lazy/consent-gated iframe src (the real embed URL parked in a data-*
// attribute) into `src` when the src itself is empty or `about:blank`, so the
// downstream embed transform sees a resolvable iframe. Mirrors fixLazyImages.
export const fixLazyIframes: DomTransform = (context) => {
  const { lazyIframeAttributes } = context

  return (document) => {
    for (const iframe of document.querySelectorAll('iframe')) {
      if (isUsableSrc(iframe.getAttribute('src'))) {
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
