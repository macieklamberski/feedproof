import type { GalleryResolver } from '../types.js'
import { extractGalleryItems } from './common.js'

// CoBlocks gallery block (carousel, stacked, masonry, collage, offset). The
// `wp-block-coblocks-gallery-*` token is distinct from `wp-block-gallery`, so this never
// overlaps the core WordPress gallery resolver.
export const coblocksGalleryResolver: GalleryResolver = {
  selector: '[class*="wp-block-coblocks-gallery"]',
  extract: (element) => {
    const items = extractGalleryItems(element, 'img')

    if (items.length < 2) {
      return
    }

    const isCarousel = (element.getAttribute('class') ?? '').includes('coblocks-gallery-carousel')

    return {
      provider: 'wordpress',
      layout: isCarousel ? 'slideshow' : undefined,
      items,
    }
  },
}
