import type { DomTransform } from '../../types.js'
import { createCitePlaceholder } from '../../utils/embeds.js'
import { resolveOrKeepUrl } from '../../utils/urls.js'

export const convertCiteCards: DomTransform = (context) => {
  const { citeResolvers, resolveUrlFn, cleanUrlFn, baseUrl } = context

  return async (document) => {
    for (const resolver of citeResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        // The card's own url never passes through cleanAnchorUrls: that transform runs
        // earlier, and the placeholder carries the url as an attribute the reader renders
        // from, not only as an anchor. So the redirect wrappers platforms bake into their
        // cards (Tumblr's t.umblr.com/href.li, feed proxies) are unwrapped here instead.
        const resolvedUrl = resolveOrKeepUrl(result.url, resolveUrlFn, baseUrl) ?? result.url
        const resolved = {
          ...result,
          url: cleanUrlFn?.(resolvedUrl) ?? resolvedUrl,
          icon: resolveOrKeepUrl(result.icon, resolveUrlFn, baseUrl),
          thumbnail: resolveOrKeepUrl(result.thumbnail, resolveUrlFn, baseUrl),
        }

        element.replaceWith(createCitePlaceholder(document, resolved))
      }
    }
  }
}
