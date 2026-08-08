import type { DomTransform } from '../../types.js'
import { hasText } from '../../utils/dom.js'

// Cargo (cargo.site) portfolio feeds emit each project as bare caption text plus a
// run of standalone images served from freight.cargo.site, with no block wrappers.
// wrapBareInlineInParagraphs would then sweep the caption, every image, and the
// trailing PREV/NEXT nav into one paragraph, gluing the images to the text. Wrapping
// each Cargo image in its own <figure> gives the run block boundaries, so the
// caption, images, and nav land in separate blocks. Runs before
// wrapBareInlineInParagraphs.
const cargoImageSelector = 'img[src*="cargo.site"], img[data-src*="cargo.site"]'

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
