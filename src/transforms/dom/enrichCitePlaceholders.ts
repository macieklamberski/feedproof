import type { CiteRef, DomTransform } from '../../types.js'
import {
  createPlaceholderEnricher,
  prepareCiteMetadata,
  updateCitePlaceholder,
} from '../../utils/widgets.js'

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
    // A payload arrives from a platform's API rather than from the feed, and it overwrites what
    // the resolver read, so its urls go through the same preparation as a resolver's: resolved
    // against the base, the canonical one cleaned.
    (element, data) => {
      updateCitePlaceholder(element, prepareCiteMetadata(data, context))
    },
  )
}
