import { createEmbedPlaceholder } from '../common.js'
import type { DomTransform } from '../types.js'
import { coerceNumber } from '../utils.js'

export const replaceMediaWithEmbedPlaceholders: DomTransform = ({ resolveEmbed, embedDomains }) => {
  return (document) => {
    if (!resolveEmbed && !embedDomains?.length) {
      return
    }

    const domains = embedDomains ?? []

    // Replace <iframe> elements.
    for (const iframe of document.querySelectorAll('iframe[src]')) {
      const src = iframe.getAttribute('src')

      if (!src) {
        continue
      }

      const resolved = resolveEmbed?.(src)
      const width = coerceNumber(iframe.getAttribute('width'))
      const height = coerceNumber(iframe.getAttribute('height'))

      if (resolved) {
        iframe.replaceWith(
          createEmbedPlaceholder(document, src, 'iframe', { ...resolved, width, height }),
        )
        continue
      }

      // For recognized embed domains without a resolver, autoload since we have no metadata.
      try {
        const hostname = new URL(src).hostname

        if (domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
          iframe.replaceWith(
            createEmbedPlaceholder(document, src, 'iframe', { autoload: true, width, height }),
          )
        }
      } catch {}
    }
  }
}
