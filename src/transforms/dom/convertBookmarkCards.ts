import { createBookmarkPlaceholder } from '../../common.js'
import type { DomTransform } from '../../types.js'

export const convertBookmarkCards: DomTransform = (context) => {
  const { bookmarkResolvers, resolveUrlFn, baseUrl } = context

  return async (document) => {
    for (const resolver of bookmarkResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        // Mirror the embed path: skip cards whose URL is unsafe or unresolvable
        // (e.g. javascript:/data:) so a hostile href never reaches the placeholder.
        if (!resolveUrlFn(result.url, baseUrl)) {
          continue
        }

        element.replaceWith(createBookmarkPlaceholder(document, result))
      }
    }
  }
}
