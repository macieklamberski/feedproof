import type { DomTransform } from '../../types.js'
import { isEmptyElement } from '../../utils/dom.js'
import { imageFileRegex } from '../../utils/urls.js'
import { createImage } from '../../utils/widgets.js'

// A Substack lightbox anchor (`a.image-link`, the Image2ToDOM/ImageToDOM components) can
// reach a feed with its <img> child stripped, leaving an empty anchor whose href is the
// full-size image itself. Remint the image inside the anchor before stripEmptyTags deletes
// it, so the lightbox link survives and the dimension and proxy passes below treat the
// minted <img> like any other.
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
