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

        // cleanAnchorUrls runs earlier, so the resolvers that read their url from an anchor
        // href get it already cleaned; the ones reading an attribute or a JSON blob (Tumblr,
        // Substack, Discourse, XenForo, Tistory, Paragraph) never pass through it, so their
        // redirect wrappers are unwrapped here. Re-cleaning an already-clean url is a no-op.
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
