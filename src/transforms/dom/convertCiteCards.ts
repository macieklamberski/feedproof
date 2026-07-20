import type { DomTransform } from '../../types.js'
import { createCitePlaceholder } from '../../utils/embeds.js'
import { resolveOrKeepUrl } from '../../utils/urls.js'

export const convertCiteCards: DomTransform = (context) => {
  const { citeResolvers, resolveUrlFn, baseUrl } = context

  return async (document) => {
    for (const resolver of citeResolvers) {
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

        element.replaceWith(createCitePlaceholder(document, resolved))
      }
    }
  }
}
