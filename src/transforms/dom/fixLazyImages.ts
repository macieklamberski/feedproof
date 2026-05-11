import type { DomTransform } from '../../types.js'

const imgPattern = /<img\s/i
// A real URL contains at least one of `:` (scheme), `/` (path), or `.` (domain
// or file extension). This rejects flag-style values like `"1"` / `"true"` /
// `"loaded"` that some libraries (Slick, plugin status markers) park on
// otherwise-lazy attribute names.
const urlShapeRegex = /[:/.]/

const isUrlShaped = (value: string): boolean => {
  return urlShapeRegex.test(value) && !value.startsWith('{') && !value.startsWith('[')
}

export const fixLazyImages: DomTransform = (context) => {
  const lazySrcAttributes = context.lazySrcAttributes ?? []
  const lazySrcsetAttributes = context.lazySrcsetAttributes ?? []

  return (document) => {
    // Move lazy-load data attributes to real src/srcset.
    const images = document.querySelectorAll('img')

    for (const image of images) {
      let srcResolved = false

      for (const attribute of lazySrcAttributes) {
        const value = image.getAttribute(attribute)

        if (!srcResolved && value && isUrlShaped(value)) {
          image.setAttribute('src', value)
          srcResolved = true
        }

        image.removeAttribute(attribute)
      }

      let srcsetResolved = false

      for (const attribute of lazySrcsetAttributes) {
        const value = image.getAttribute(attribute)

        if (!srcsetResolved && value && isUrlShaped(value)) {
          image.setAttribute('srcset', value)
          srcsetResolved = true
        }

        image.removeAttribute(attribute)
      }
    }

    // Extract images from noscript wrappers when sibling is a lazy placeholder.
    const noscripts = document.querySelectorAll('noscript')

    for (const noscript of noscripts) {
      const sibling = noscript.previousElementSibling

      if (sibling?.tagName !== 'IMG') {
        continue
      }

      const inner = noscript.textContent ?? ''
      const hasImage = imgPattern.test(inner)

      if (!hasImage) {
        continue
      }

      sibling.remove()
      noscript.outerHTML = inner
    }
  }
}
