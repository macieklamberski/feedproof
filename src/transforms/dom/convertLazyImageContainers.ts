import type { DomTransform } from '../../types.js'
import { imageFileRegex } from '../../utils/urls.js'
import { createImage } from '../../utils/widgets.js'

// A <div> or <figure> that parks the image url in a lazy attribute and builds the <img> with JS.
// A gallery widget renders one as <div class="…_gallery_img" data-src="…">.
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

        // Without the extension check an AJAX loader url on the same attribute becomes an <img>.
        if (value && imageFileRegex.test(value)) {
          element.replaceWith(createImage(document, { src: value }))
          break
        }
      }
    }
  }
}
