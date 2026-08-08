import type { DomTransform } from '../../types.js'
import { createGalleryPlaceholder } from '../../utils/widgets.js'

export const convertGalleries: DomTransform = (context) => {
  const { galleryResolvers } = context

  return async (document) => {
    for (const resolver of galleryResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        element.replaceWith(createGalleryPlaceholder(document, result))
      }
    }
  }
}
