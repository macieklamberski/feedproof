import {
  createEmbedPlaceholder,
  getElementDimensions,
  getWrapperAspectRatio,
} from '../../common.js'
import type { DomTransform } from '../../types.js'

// A real, loadable src — not empty or the `about:blank` lazy placeholder.
const isUsableSrc = (src: string | null): src is string => {
  const trimmed = src?.trim()
  return !!trimmed && trimmed !== 'about:blank'
}

// Rejects flag-style values; a real URL carries a `:`, `/`, or `.`.
const urlShapeRegex = /[:/.]/

// Promote a lazy/consent-gated iframe src (the real embed URL parked in a data-*
// attribute) into `src` when the src itself is empty or `about:blank`.
const recoverLazyIframeSrc = (iframe: Element, attributes: ReadonlyArray<string>): void => {
  if (isUsableSrc(iframe.getAttribute('src'))) {
    return
  }

  for (const attribute of attributes) {
    const value = iframe.getAttribute(attribute)

    if (value && urlShapeRegex.test(value)) {
      iframe.setAttribute('src', value)
      return
    }
  }
}

// When the iframe carries no usable dimensions, fall back to a responsive wrapper's
// aspect ratio so the placeholder can still reserve space. The 100×N pair encodes the
// ratio, not absolute pixels.
const getEmbedDimensions = (element: Element): { width?: number; height?: number } => {
  const dimensions = getElementDimensions(element)

  if (dimensions.width === undefined && dimensions.height === undefined) {
    const ratio = getWrapperAspectRatio(element)

    if (ratio !== undefined) {
      return { width: 100, height: Math.round(100 / ratio) }
    }
  }

  return dimensions
}

export const replaceEmbedsWithPlaceholders: DomTransform = (context) => {
  const { embedResolvers, resolveUrlFn, baseUrl, lazyIframeAttributes } = context

  return async (document) => {
    const iframeSnapshot = document.getElementsByTagName('iframe') as unknown as Array<Element>
    const hasIframes = iframeSnapshot.length > 0

    // Promote lazy/consent srcs first so both the resolvers and the fallback see them.
    if (hasIframes) {
      for (const iframe of iframeSnapshot) {
        recoverLazyIframeSrc(iframe, lazyIframeAttributes)
      }
    }

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

    // Generic iframe fallback. Resolvers may have detached some iframes (parentNode null).
    if (hasIframes) {
      for (const iframe of iframeSnapshot) {
        if (!iframe.parentNode) {
          continue
        }

        const src = iframe.getAttribute('src')

        if (isUsableSrc(src) && resolveUrlFn(src, baseUrl)) {
          iframe.replaceWith(createEmbedPlaceholder(document, src, getEmbedDimensions(iframe)))
        }
      }
    }

    // Legacy <object data> / <embed src> carriers — the iframe-only paths above miss
    // them. Replace with a provider-less placeholder when the URL resolves.
    for (const element of document.querySelectorAll('object[data], embed[src]')) {
      const url =
        element.localName === 'object' ? element.getAttribute('data') : element.getAttribute('src')

      if (url && resolveUrlFn(url, baseUrl)) {
        element.replaceWith(createEmbedPlaceholder(document, url, getEmbedDimensions(element)))
      }
    }
  }
}
