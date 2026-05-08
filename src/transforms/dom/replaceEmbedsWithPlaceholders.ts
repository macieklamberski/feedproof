import { createEmbedPlaceholder } from '../../common.js'
import type { DomTransform } from '../../types.js'
import { coerceNumber } from '../../utils.js'

export const replaceEmbedsWithPlaceholders: DomTransform = (context) => {
  const resolvers = context.embedResolvers ?? []

  return (document) => {
    if (resolvers.length === 0) {
      return
    }

    for (const resolver of resolvers) {
      const elements = document.querySelectorAll(resolver.selector)

      for (const element of elements) {
        const metadata = resolver.extract(element)

        if (!metadata) {
          continue
        }

        const width = coerceNumber(element.getAttribute('width')) ?? metadata.width
        const height = coerceNumber(element.getAttribute('height')) ?? metadata.height

        const placeholder = createEmbedPlaceholder(
          document,
          metadata.src,
          metadata.type ?? 'iframe',
          { ...metadata, width, height },
        )

        element.replaceWith(placeholder)
      }
    }
  }
}
