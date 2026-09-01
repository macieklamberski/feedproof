import type { CiteRef, DomTransform } from '../../types.js'
import { prepareCiteMetadata, updateCitePlaceholder } from '../../utils/widgets.js'

export const enrichCitePlaceholders: DomTransform = (context) => {
  const { enrichCiteFn } = context

  if (!enrichCiteFn) {
    return () => {}
  }

  return async (document) => {
    const placeholders = document.querySelectorAll('[data-cite-provider]')
    const count = placeholders.length

    if (!count) {
      return
    }

    const cites: Array<CiteRef> = new Array(count)
    for (let i = 0; i < count; i++) {
      const element = placeholders[i]

      cites[i] = {
        provider: element.getAttribute('data-cite-provider') ?? '',
        url: element.getAttribute('data-cite-url') ?? '',
      }
    }

    // Positional: the answer for placeholders[i] is enriched[i], undefined where the enricher
    // found nothing.
    const enriched = await enrichCiteFn(cites)

    for (let i = 0; i < count; i++) {
      const data = enriched[i]

      if (!data) {
        continue
      }

      // A payload arrives from a platform's API rather than from the feed, and it overwrites what
      // the resolver read, so its urls go through the same preparation as a resolver's: resolved
      // against the base, the canonical one cleaned.
      updateCitePlaceholder(placeholders[i], prepareCiteMetadata(data, context))
    }
  }
}
