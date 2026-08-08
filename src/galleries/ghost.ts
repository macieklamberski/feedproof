import type { GalleryResolver } from '../types.js'
import { directCaption, extractGalleryItems } from './common.js'

export const ghostGalleryResolver: GalleryResolver = {
  selector: '.kg-gallery-card',
  extract: (element) => {
    const items = extractGalleryItems(element, 'img')

    if (items.length < 2) {
      return
    }

    return {
      provider: 'ghost',
      title: directCaption(element),
      items,
    }
  },
}
