import type { DomTransform } from '../../types.js'
import { hasText } from '../../utils/dom.js'

const cargoImageSelector = 'img[src*="cargo.site"], img[data-src*="cargo.site"]'

// A Cargo project: caption text and a run of bare images with no block wrappers between them,
// which wrapBareInlineInParagraphs would sweep into one paragraph along with the caption and nav.
// The images are served from freight.cargo.site and a PREV/NEXT nav trails the run.
export const wrapCargoGalleryImages: DomTransform = () => {
  return (document) => {
    for (const image of document.querySelectorAll(cargoImageSelector)) {
      // Wrap the enclosing textless link when the image is a bare gallery link, so the
      // anchor stays intact and the whole thing becomes one block.
      const parent = image.parentElement
      const target = parent?.localName === 'a' && !hasText(parent) ? parent : image

      // Leave images already inside a figure (keeps the pass idempotent) or inside a
      // paragraph/heading/caption, where they read as intentionally inline and a
      // <figure> would be invalid.
      if (target.closest('figure, p, figcaption, h1, h2, h3, h4, h5, h6')) {
        continue
      }

      const figure = document.createElement('figure')
      target.replaceWith(figure)
      figure.appendChild(target)
    }
  }
}
