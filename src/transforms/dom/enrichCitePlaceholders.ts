import type { CiteRef, DomTransform } from '../../types.js'
import {
  createPlaceholderEnricher,
  prepareCiteMetadata,
  updateCitePlaceholder,
} from '../../utils/widgets.js'

// A cite placeholder carrying only the provider and url the feed markup gave it.
export const enrichCitePlaceholders: DomTransform = (context) => {
  const { enrichCiteFn } = context

  if (!enrichCiteFn) {
    return () => {}
  }

  return createPlaceholderEnricher(
    '[data-cite-provider]',
    (element): CiteRef => ({
      provider: element.getAttribute('data-cite-provider') ?? '',
      url: element.getAttribute('data-cite-url') ?? '',
    }),
    enrichCiteFn,
    // The payload's urls arrive from the platform API unresolved and uncleaned.
    (element, data) => {
      updateCitePlaceholder(element, prepareCiteMetadata(data, context))
    },
  )
}
