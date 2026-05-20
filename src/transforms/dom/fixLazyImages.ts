import { normalizeAttributeCase } from '../../common.js'
import type { DomTransform } from '../../types.js'

const imgPattern = /<img\s/i
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

      if (hasSrcCandidate) {
        let srcResolved = false

        for (const attribute of lazySrcAttributes) {
          const value = image.getAttribute(attribute)

          if (value === null) {
            continue
          }

          if (!srcResolved && value && isUrlShaped(value)) {
            image.setAttribute('src', value)
            srcResolved = true
          }

          image.removeAttribute(attribute)
        }
      }

      if (hasSrcsetCandidate) {
        let srcsetResolved = false

        for (const attribute of lazySrcsetAttributes) {
          const value = image.getAttribute(attribute)

          if (value === null) {
            continue
          }

          if (!srcsetResolved && value && isUrlShaped(value)) {
            image.setAttribute('srcset', value)
            srcsetResolved = true
          }

          image.removeAttribute(attribute)
        }
      }
    }

    // Extract images from noscript wrappers when sibling is a lazy placeholder.
    const noscripts = document.querySelectorAll('noscript')
    let replacedNoscript = false

    for (const noscript of noscripts) {
      const sibling = noscript.previousElementSibling

      if (sibling?.localName !== 'img') {
        continue
      }

      const inner = noscript.innerHTML

      if (!imgPattern.test(inner)) {
        continue
      }

      sibling.remove()
      noscript.outerHTML = inner
      replacedNoscript = true
    }

    // outerHTML= bypasses parseFragment's attribute-case normalization.
    if (replacedNoscript) {
      normalizeAttributeCase(document)
    }
  }
}
