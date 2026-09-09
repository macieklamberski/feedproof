import type { DomTransform } from '../../types.js'
import { isUrlShaped } from '../../utils/urls.js'

const imgRegex = /<img\s/i

// Lazy image attributes also carry JSON blobs, which isUrlShaped alone lets through.
const isUsableLazyValue = (value: string): boolean => {
  return isUrlShaped(value) && !value.startsWith('{') && !value.startsWith('[')
}

// An <img> whose real src or srcset sits in a lazy attribute, or in a <noscript> twin beside it.
export const fixLazyImages: DomTransform = (context) => {
  const lazySrcSet = new Set(context.lazySrcAttributes)
  const lazySrcsetSet = new Set(context.lazySrcsetAttributes)
  const { lazySrcAttributes, lazySrcsetAttributes } = context

  return (document) => {
    // <source> included: flattenPictureElements reads its srcset next and would drop the AVIF one.
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

    // Extract the image from a noscript wrapper when an <img> sits directly before it.
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
