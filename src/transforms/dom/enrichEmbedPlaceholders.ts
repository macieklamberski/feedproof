import type { DomTransform, EmbedRef } from '../../types.js'
import { prepareEmbedMetadata, updateEmbedPlaceholder } from '../../utils/widgets.js'

export const enrichEmbedPlaceholders: DomTransform = (context) => {
  const { enrichEmbedFn } = context

  if (!enrichEmbedFn) {
    return () => {}
  }

  return async (document) => {
    const placeholders = document.querySelectorAll('[data-embed-provider][data-embed-id]')
    const count = placeholders.length

    if (!count) {
      return
    }

    const embeds: Array<EmbedRef> = new Array(count)

    for (let i = 0; i < count; i++) {
      const element = placeholders[i]

      embeds[i] = {
        provider: element.getAttribute('data-embed-provider') ?? '',
        id: element.getAttribute('data-embed-id') ?? '',
      }
    }

    // Positional: the answer for placeholders[i] is enriched[i], undefined where the enricher
    // found nothing.
    const enriched = await enrichEmbedFn(embeds)

    for (let i = 0; i < count; i++) {
      const data = enriched[i]

      if (!data) {
        continue
      }

      // A payload arrives from a platform's API rather than from the feed, and it overwrites what
      // the resolver read, so its urls go through the same preparation as a resolver's: resolved
      // against the base, the canonical one cleaned.
      updateEmbedPlaceholder(placeholders[i], prepareEmbedMetadata(data, context))
    }
  }
}
