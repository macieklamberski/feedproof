import type { DomTransform } from '../../types.js'
import { isEmptyElement } from '../../utils/dom.js'
import { imageFileRegex } from '../../utils/urls.js'
import { createImage } from '../../utils/widgets.js'

// A Substack lightbox anchor shipped without its <img>, an empty link whose href is the image.
// Substack's Image2ToDOM and ImageToDOM components write the anchor.
export const fixSubstackImageLinks: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('a.image-link')) {
    if (!isEmptyElement(element)) {
      continue
    }

    const href = element.getAttribute('href')

    if (!href || !imageFileRegex.test(href)) {
      continue
    }

    element.appendChild(createImage(document, { src: href }))
  }
}
