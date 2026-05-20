import { createEmbedPlaceholder, getDimensions } from '../../common.js'
import type { DomTransform } from '../../types.js'

export const replaceEmbedsWithPlaceholders: DomTransform = (context) => {
  const { embedResolvers, resolveUrlFn, baseUrl } = context

  return async (document) => {
    const iframeSnapshot = document.getElementsByTagName('iframe') as unknown as Array<Element>
    const hasIframes = iframeSnapshot.length > 0

    for (const resolver of embedResolvers) {
      if (!hasIframes && resolver.selector.startsWith('iframe')) {
        continue
      }

      for (const element of document.querySelectorAll(resolver.selector)) {
        const metadata = await resolver.extract(element)

        if (!metadata) {
          continue
        }

        if (!resolveUrlFn(metadata.src, baseUrl)) {
          continue
        }

        if (metadata.url && !resolveUrlFn(metadata.url, baseUrl)) {
          continue
        }

        const { width, height } = getDimensions(element)

        const placeholderMetadata =
          width === undefined && height === undefined
            ? metadata
            : {
                ...metadata,
                width: width ?? metadata.width,
                height: height ?? metadata.height,
              }

        element.replaceWith(createEmbedPlaceholder(document, metadata.src, placeholderMetadata))
      }
    }

    if (!hasIframes) {
      return
    }

    // Resolvers may have detached some iframes — skip those (parentNode null).
    for (const iframe of iframeSnapshot) {
      if (!iframe.parentNode) {
        continue
      }

      const src = iframe.getAttribute('src')

      if (!src) {
        continue
      }

      if (!resolveUrlFn(src, baseUrl)) {
        continue
      }

      iframe.replaceWith(createEmbedPlaceholder(document, src, getDimensions(iframe)))
    }
  }
}
