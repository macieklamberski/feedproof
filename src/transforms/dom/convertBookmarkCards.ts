import { createBookmarkPlaceholder } from '../../common.js'
import type { DomTransform } from '../../types.js'

export const convertBookmarkCards: DomTransform = (context) => {
  const { bookmarkResolvers } = context

  return async (document) => {
    for (const resolver of bookmarkResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        element.replaceWith(createBookmarkPlaceholder(document, result))
      }
    }
  }
}
