import type { DomTransform } from '../../types.js'
import { createCitePlaceholder, prepareCiteMetadata } from '../../utils/widgets.js'

export const convertCiteCards: DomTransform = (context) => {
  const { citeResolvers } = context

  return async (document) => {
    for (const resolver of citeResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        // Spread back over the resolver's own result because preparation is typed for the
        // enricher's payload, where every field is optional, while a placeholder is built from a
        // card that states a url. Nothing prepared is lost: a field it fills wins over the same
        // field underneath.
        const prepared = { ...result, ...prepareCiteMetadata(result, context) }

        element.replaceWith(createCitePlaceholder(document, prepared))
      }
    }
  }
}
