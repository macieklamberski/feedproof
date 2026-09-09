import type { DomTransform } from '../../types.js'
import { createCitePlaceholder, prepareCiteMetadata } from '../../utils/widgets.js'

// Quote and link cards a cite resolver claims, shipped as the platform's own card markup.
export const convertCiteCards: DomTransform = (context) => {
  const citeResolvers = context.widgetResolvers.filter((resolver) => resolver.kind === 'cite')

  return async (document) => {
    for (const resolver of citeResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        // Prepared alone types every field optional and loses the url the placeholder needs.
        const prepared = { ...result, ...prepareCiteMetadata(result, context) }

        element.replaceWith(createCitePlaceholder(document, prepared))
      }
    }
  }
}
