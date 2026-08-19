import type { DomTransform } from '../../types.js'
import { resolveOrKeepUrl } from '../../utils/urls.js'
import { createCitePlaceholder, parseOrKeepDate } from '../../utils/widgets.js'

export const convertCiteCards: DomTransform = (context) => {
  const { citeResolvers, resolveUrlFn, cleanUrlFn, parseDateFn, baseUrl } = context

  return async (document) => {
    for (const resolver of citeResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        // cleanAnchorUrls runs earlier, so the resolvers that read their url from an anchor
        // href get it already cleaned. The ones reading an attribute or a JSON blob (Tumblr,
        // Substack, Discourse, XenForo, Tistory, Paragraph) never pass through it, so their
        // redirect wrappers are unwrapped here. Re-cleaning an already-clean url is a no-op.
        const resolvedUrl = resolveOrKeepUrl(result.url, resolveUrlFn, baseUrl)
        const resolved = {
          ...result,
          url: cleanUrlFn?.(resolvedUrl) ?? resolvedUrl,
          icon: resolveOrKeepUrl(result.icon, resolveUrlFn, baseUrl),
          thumbnail: resolveOrKeepUrl(result.thumbnail, resolveUrlFn, baseUrl),
          date: parseOrKeepDate(result.date, parseDateFn),
        }

        element.replaceWith(createCitePlaceholder(document, resolved))
      }
    }
  }
}
