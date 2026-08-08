import type { GalleryResolver } from '../types.js'
import { directCaption, extractGalleryItems } from './common.js'

// Covers both modern (figure.wp-block-gallery.has-nested-images > figure.wp-block-image > a > img)
// and legacy (ul.wp-block-gallery > li.blocks-gallery-item > figure > a > img) shapes.
export const wordpressGalleryResolver: GalleryResolver = {
  selector: '.wp-block-gallery',
  extract: (element) => {
    const items = extractGalleryItems(element, 'img')

    if (items.length < 2) {
      return
    }

    return {
      provider: 'wordpress',
      title: directCaption(element),
      items,
    }
  },
}
