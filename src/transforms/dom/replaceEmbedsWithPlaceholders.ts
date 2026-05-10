import { createEmbedPlaceholder } from '../../common.js'
import type { DomTransform } from '../../types.js'
import { coerceNumber, isHttpUrl } from '../../utils.js'

export const replaceEmbedsWithPlaceholders: DomTransform = (context) => {
  const resolvers = context.embedResolvers ?? []

  return (document) => {
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

    for (const iframe of document.querySelectorAll('iframe[src]')) {
      const src = iframe.getAttribute('src') ?? ''

      if (!isHttpUrl(src)) {
        continue
      }

      const width = coerceNumber(iframe.getAttribute('width'))
      const height = coerceNumber(iframe.getAttribute('height'))

      iframe.replaceWith(createEmbedPlaceholder(document, src, 'iframe', { width, height }))
    }
  }
}
