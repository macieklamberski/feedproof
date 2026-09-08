import type { DomTransform, EmbedRef } from '../../types.js'
import {
  createPlaceholderEnricher,
  prepareEmbedMetadata,
  updateEmbedPlaceholder,
} from '../../utils/widgets.js'

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
    // A payload arrives from a platform's API rather than from the feed, and it overwrites what
    // the resolver read, so its urls go through the same preparation as a resolver's: resolved
    // against the base, the canonical one cleaned.
    (element, data) => {
      updateEmbedPlaceholder(element, prepareEmbedMetadata(data, context))
    },
  )
}
