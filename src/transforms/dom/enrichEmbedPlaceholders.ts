import type { DomTransform, EmbedRef } from '../../types.js'
import {
  createPlaceholderEnricher,
  prepareEmbedMetadata,
  updateEmbedPlaceholder,
} from '../../utils/widgets.js'

// An embed placeholder carrying only the provider and id the feed markup gave it.
export const enrichEmbedPlaceholders: DomTransform = (context) => {
  const { enrichEmbedFn } = context

  if (!enrichEmbedFn) {
    return () => {}
  }

  return createPlaceholderEnricher(
    '[data-embed-provider][data-embed-id]',
    (element): EmbedRef => ({
      provider: element.getAttribute('data-embed-provider') ?? '',
      id: element.getAttribute('data-embed-id') ?? '',
    }),
    enrichEmbedFn,
    // The payload's urls arrive from the platform API unresolved and uncleaned.
    (element, data) => {
      updateEmbedPlaceholder(element, prepareEmbedMetadata(data, context))
    },
  )
}
