import type { DomTransform } from '../../types.js'

const imgRegex = /<img\s/i
// Rejects flag-style values like `"1"` / `"true"` / `"loaded"` that some
// libraries park on otherwise-lazy attribute names.
const urlShapeRegex = /[:/.]/

const isUrlShaped = (value: string): boolean => {
  return urlShapeRegex.test(value) && !value.startsWith('{') && !value.startsWith('[')
}

export const fixLazyImages: DomTransform = (context) => {
  const lazySrcSet = new Set(context.lazySrcAttributes)
  const lazySrcsetSet = new Set(context.lazySrcsetAttributes)
  const { lazySrcAttributes, lazySrcsetAttributes } = context

  return (document) => {
    const images = document.querySelectorAll('img')

    for (const image of images) {
      let hasSrcCandidate = false
      let hasSrcsetCandidate = false

      for (const name of image.getAttributeNames()) {
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
          const value = image.getAttribute(attribute)

          if (value && isUrlShaped(value)) {
            image.setAttribute('src', value)
            break
          }
        }
      }

      if (hasSrcsetCandidate) {
        for (const attribute of lazySrcsetAttributes) {
          const value = image.getAttribute(attribute)

          if (value && isUrlShaped(value)) {
            image.setAttribute('srcset', value)
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
