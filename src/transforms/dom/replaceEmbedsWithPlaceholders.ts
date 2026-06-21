import {
  createEmbedPlaceholder,
  getElementDimensions,
  getWrapperAspectRatio,
  resolveOrKeepUrl,
} from '../../common.js'
import type { DomTransform } from '../../types.js'

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
  const { embedResolvers, resolveUrlFn, baseUrl } = context

  return async (document) => {
    // A static snapshot: the fallback loop below replaces iframes, and a live
    // getElementsByTagName collection would shrink mid-iteration and skip elements.
    const iframeSnapshot = Array.from(document.getElementsByTagName('iframe'))
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

        const resolvedSrc = resolveUrlFn(metadata.src, baseUrl)

        if (!resolvedSrc) {
          continue
        }

        let resolvedUrl: string | undefined

        if (metadata.url) {
          resolvedUrl = resolveUrlFn(metadata.url, baseUrl)

          if (!resolvedUrl) {
            continue
          }
        }

        const { width, height } = getEmbedDimensions(element)

        const placeholderMetadata = {
          ...metadata,
          src: resolvedSrc,
          url: resolvedUrl,
          thumbnail: resolveOrKeepUrl(metadata.thumbnail, resolveUrlFn, baseUrl),
          avatar: resolveOrKeepUrl(metadata.avatar, resolveUrlFn, baseUrl),
          width: width ?? metadata.width,
          height: height ?? metadata.height,
        }

        element.replaceWith(createEmbedPlaceholder(document, resolvedSrc, placeholderMetadata))
      }
    }

    // Generic iframe fallback. Resolvers may have detached some iframes (parentNode null).
    if (hasIframes) {
      for (const iframe of iframeSnapshot) {
        if (!iframe.parentNode) {
          continue
        }

        const src = iframe.getAttribute('src')

        // resolveUrlFn rejects `about:blank`; the trim drops empty/whitespace placeholders
        // (which would otherwise resolve to the base URL).
        const resolved = src?.trim() ? resolveUrlFn(src, baseUrl) : undefined

        if (resolved) {
          iframe.replaceWith(createEmbedPlaceholder(document, resolved, getEmbedDimensions(iframe)))
        }
      }
    }

    // Legacy <object data> / <embed src> carriers — the iframe-only paths above miss
    // them. Replace with a provider-less placeholder when the URL resolves.
    for (const element of document.querySelectorAll('object[data], embed[src]')) {
      const url =
        element.localName === 'object' ? element.getAttribute('data') : element.getAttribute('src')
      const resolved = url ? resolveUrlFn(url, baseUrl) : undefined

      if (resolved) {
        element.replaceWith(createEmbedPlaceholder(document, resolved, getEmbedDimensions(element)))
      }
    }
  }
}
