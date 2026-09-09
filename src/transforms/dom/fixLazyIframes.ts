import { isAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

// Blank pages a platform points a deferred iframe's src at while the real URL sits in a
// lazy attribute: a src matching one of these is a placeholder, not content.
// Invision Community pairs its page with data-embed-src, Complianz its video with data-src-cmplz.
const placeholderPageRegexes = [
  // Invision Community's blank page or spacer image.
  /\/applications\/core\/interface\/(?:index\.html|js\/spacer\.png)(?:[?#]|$)/,
  /\/complianz-gdpr(?:-premium)?\/assets\/video\//, // Complianz's placeholder video
]

// An iframe whose src is blank or a placeholder page, the real url parked in a lazy attribute.
export const fixLazyIframes: DomTransform = (context) => {
  const { lazyIframeAttributes, baseUrl, resolveUrlFn } = context

  return (document) => {
    for (const iframe of document.querySelectorAll('iframe')) {
      const src = iframe.getAttribute('src')

      if (isUsableSrc(src) && !isAnyOf(src, placeholderPageRegexes)) {
        continue
      }

      for (const attribute of lazyIframeAttributes) {
        const value = iframe.getAttribute(attribute)

        if (value && isUrlShaped(value)) {
          // resolveRelativeUrls already ran, so a protocol-relative value resolves here or never.
          iframe.setAttribute('src', resolveUrlFn(value, baseUrl) ?? value)
          break
        }
      }
    }
  }
}
