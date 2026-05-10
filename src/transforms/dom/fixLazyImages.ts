import type { DomTransform } from '../../types.js'

const imgPattern = /<img\s/i

export const fixLazyImages: DomTransform = (context) => {
  const lazySrcAttributes = context.lazySrcAttributes ?? []

  return (document) => {
    // Move lazy-load data attributes to real src/srcset.
    const images = document.querySelectorAll('img')

    for (const image of images) {
      let resolved = false

      for (const attribute of lazySrcAttributes) {
        const value = image.getAttribute(attribute)

        if (!resolved && value) {
          image.setAttribute('src', value)
          resolved = true
        }

        image.removeAttribute(attribute)
      }

      const dataSrcset = image.getAttribute('data-srcset')

      if (dataSrcset) {
        image.setAttribute('srcset', dataSrcset)
        image.removeAttribute('data-srcset')
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
