import type { DomTransform } from '../../types.js'
import { isUrlShaped } from '../../utils/urls.js'

const imgRegex = /<img\s/i

// Stricter than the shared check: image lazy-attributes also carry JSON blobs
// (srcset descriptors, gallery configs), which are never a usable src.
const isUsableLazyValue = (value: string): boolean => {
  return isUrlShaped(value) && !value.startsWith('{') && !value.startsWith('[')
}

export const fixLazyImages: DomTransform = (context) => {
  const lazySrcSet = new Set(context.lazySrcAttributes)
  const lazySrcsetSet = new Set(context.lazySrcsetAttributes)
  const { lazySrcAttributes, lazySrcsetAttributes } = context

  return (document) => {
    // <source> is included so lazy srcset on <picture><source> is promoted before
    // flattenPictureElements reads it — otherwise the modern AVIF/WebP source is dropped.
    const elements = document.querySelectorAll('img, source')

    for (const element of elements) {
      let hasSrcCandidate = false
      let hasSrcsetCandidate = false

      for (const name of element.getAttributeNames()) {
        if (!hasSrcCandidate && lazySrcSet.has(name)) {
          hasSrcCandidate = true
        }

        if (!hasSrcsetCandidate && lazySrcsetSet.has(name)) {
          hasSrcsetCandidate = true
        }

        if (hasSrcCandidate && hasSrcsetCandidate) {
          break
        }
      }

      // Promote the real src/srcset but keep the original lazy attributes in place.
      if (hasSrcCandidate) {
        for (const attribute of lazySrcAttributes) {
          const value = element.getAttribute(attribute)

          if (value && isUsableLazyValue(value)) {
            element.setAttribute('src', value)
            break
          }
        }
      }

      if (hasSrcsetCandidate) {
        for (const attribute of lazySrcsetAttributes) {
          const value = element.getAttribute(attribute)

          if (value && isUsableLazyValue(value)) {
            element.setAttribute('srcset', value)
            break
          }
        }
      }
    }

    // Extract images from noscript wrappers when sibling is a lazy placeholder.
    const noscripts = document.querySelectorAll('noscript')

    for (const noscript of noscripts) {
      const sibling = noscript.previousElementSibling

      if (sibling?.localName !== 'img') {
        continue
      }

      const inner = noscript.innerHTML

      if (!imgRegex.test(inner)) {
        continue
      }

      sibling.remove()
      noscript.outerHTML = inner
    }
  }
}
