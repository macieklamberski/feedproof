import type { GalleryResolver } from '../types.js'
import { extractGalleryItems } from './common.js'

// Jetpack slideshow block. Slides are li.swiper-slide > figure > img; the navigation
// arrows and pagination bullets carry no <img>, so a plain image walk yields only slide
// images.
export const jetpackSlideshowResolver: GalleryResolver = {
  selector: '.wp-block-jetpack-slideshow',
  extract: (element) => {
    const items = extractGalleryItems(element, 'img')

    if (items.length < 2) {
      return
    }

    return {
      provider: 'wordpress',
      layout: 'slideshow',
      items,
    }
  },
}
