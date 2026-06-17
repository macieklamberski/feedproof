import { createEmbedPlaceholder, getDimensions } from '../../common.js'
import type { DomTransform } from '../../types.js'

// The dominant responsive-embed shape puts the aspect ratio on a wrapper
// (`padding-bottom:56.25%`) with the iframe itself at `width="100%"` or unsized.
// Parsed off the raw `style` attribute rather than the CSSOM `style` API: linkedom's
// getPropertyValue returns `undefined` (not "") for unset properties, and both parsers
// drop declarations whose property name isn't lowercase — a case-insensitive regex
// matches those, and this mirrors getDimensions, which also reads getAttribute('style').
const paddingRatioRegex = /padding-(?:bottom|top):\s*([\d.]+)%/i

// When the iframe carries no usable dimensions, derive an aspect ratio from an
// ancestor wrapper's padding hack so the placeholder can still reserve space.
// The 100×N pair encodes the ratio (N% of the width), not absolute pixels.
const getWrapperAspect = (element: Element): { width?: number; height?: number } => {
  let current = element.parentElement
  let depth = 0

  while (current && depth < 3) {
    const style = current.getAttribute('style')
    const match = style ? paddingRatioRegex.exec(style) : null

    if (match) {
      const percent = Number(match[1])

      if (percent > 0 && percent < 1000) {
        return { width: 100, height: Math.round(percent) }
      }
    }

    current = current.parentElement
    depth++
  }

  return {}
}

const getEmbedDimensions = (element: Element): { width?: number; height?: number } => {
  const dimensions = getDimensions(element)

  if (dimensions.width === undefined && dimensions.height === undefined) {
    return getWrapperAspect(element)
  }

  return dimensions
}

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

        const { width, height } = getEmbedDimensions(element)

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

      iframe.replaceWith(createEmbedPlaceholder(document, src, getEmbedDimensions(iframe)))
    }
  }
}
