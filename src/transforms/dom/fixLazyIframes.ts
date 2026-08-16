import { isAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

// Blank pages a platform points a deferred iframe's src at while the real URL sits in a
// lazy attribute: a src matching one of these is a placeholder, not content.
const placeholderPageRegexes = [
  /\/applications\/core\/interface\/index\.html(?:[?#]|$)/, // Invision Community, paired with data-embed-src.
  /\/complianz-gdpr(?:-premium)?\/assets\/video\//, // Complianz placeholder video, paired with data-src-cmplz.
]

// Promote a lazy/consent-gated iframe src (the real embed URL parked in a data-*
// attribute) into `src` when the src itself is empty or `about:blank`, so the
// downstream embed transform sees a resolvable iframe.
export const fixLazyIframes: DomTransform = (context) => {
  const { lazyIframeAttributes } = context

  return (document) => {
    for (const iframe of document.querySelectorAll('iframe')) {
      const src = iframe.getAttribute('src')

      if (isUsableSrc(src) && !isAnyOf(src, placeholderPageRegexes)) {
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
