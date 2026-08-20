import type { DomTransform } from '../../types.js'
import { imageFileRegex } from '../../utils/urls.js'
import { createImage } from '../../utils/widgets.js'

// Lazy-image containers: a <div>/<figure> that parks the real image URL in a lazy
// data-* attribute and builds the <img> with JS on load (e.g. gallery widgets that
// render `<div class="…_gallery_img" data-src="…">`). A reader runs no JS, so the
// image never appears. Replace the container with a plain <img> when it directly
// carries an image-shaped lazy src and wraps no media of its own.
export const convertLazyImageContainers: DomTransform = (context) => {
  const { lazySrcAttributes } = context

  return (document) => {
    for (const element of document.querySelectorAll('div, figure')) {
      // A container that already wraps media is a layout wrapper. The lazy attribute
      // belongs to the inner element, not to a missing image.
      if (element.querySelector('img, picture, video, iframe, source')) {
        continue
      }

      for (const attribute of lazySrcAttributes) {
        const value = element.getAttribute(attribute)

        // The extension check keeps a non-image lazy src (an AJAX content-loader URL parked
        // on the same attribute name) from being turned into an <img>.
        if (value && imageFileRegex.test(value)) {
          element.replaceWith(createImage(document, { src: value }))
          break
        }
      }
    }
  }
}
