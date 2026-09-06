import { isNonEmptyString } from 'trousse'
import type { DomTransform } from '../../types.js'
import { jsonAttr } from '../../utils/dom.js'
import { createImage } from '../../utils/widgets.js'

// A Substack image gallery reaches the feed as an empty <div class="image-gallery-embed">
// whose images, caption and alt live only in its data-attrs JSON, so the whole gallery
// vanishes in a reader. Rebuild the figure the hydrated page renders: one <img> per gallery
// image, the shared alt on each, and the caption as the figcaption. The payload's
// `staticGalleryImage` is a cropped collage of the same images, so it is left out.
type GalleryAttrs = {
  gallery?: {
    images?: Array<{ src?: string } | null>
    caption?: string
    alt?: string
  }
}

export const fixSubstackGalleries: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('div.image-gallery-embed')) {
    const gallery = jsonAttr<GalleryAttrs>(element, 'data-attrs')?.gallery
    const images = Array.isArray(gallery?.images) ? gallery.images : []
    const sources = images.map((image) => image?.src).filter(isNonEmptyString)

    if (sources.length === 0) {
      continue
    }

    const figure = document.createElement('figure')

    for (const src of sources) {
      figure.appendChild(createImage(document, { src, alt: gallery?.alt }))
    }

    if (isNonEmptyString(gallery?.caption)) {
      const figcaption = document.createElement('figcaption')
      figcaption.textContent = gallery.caption
      figure.appendChild(figcaption)
    }

    element.replaceWith(figure)
  }
}
