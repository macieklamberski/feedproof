import type { DomTransform } from '../../types.js'
import { createBookmarkPlaceholder } from '../../utils/embeds.js'
import { resolveOrKeepUrl } from '../../utils/urls.js'

export const convertBookmarkCards: DomTransform = (context) => {
  const { bookmarkResolvers, resolveUrlFn, baseUrl } = context

  return async (document) => {
    for (const resolver of bookmarkResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        const resolved = {
          ...result,
          url: resolveOrKeepUrl(result.url, resolveUrlFn, baseUrl) ?? result.url,
          icon: resolveOrKeepUrl(result.icon, resolveUrlFn, baseUrl),
          thumbnail: resolveOrKeepUrl(result.thumbnail, resolveUrlFn, baseUrl),
        }

        element.replaceWith(createBookmarkPlaceholder(document, resolved))
      }
    }
  }
}
