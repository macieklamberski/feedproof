import type { DomTransform } from '../../types.js'
import { updateCitePlaceholder } from '../../utils/widgets.js'

export const enrichCitePlaceholders: DomTransform = (context) => {
  const { enrichCiteFn, parseDateFn } = context

  if (!enrichCiteFn) {
    return () => {}
  }

  return async (document) => {
    const placeholders = document.querySelectorAll('[data-cite-provider][data-cite-url]')
    const count = placeholders.length

    if (!count) {
      return
    }

    const cites: Array<{ provider: string; url: string }> = new Array(count)
    for (let i = 0; i < count; i++) {
      const element = placeholders[i]

      cites[i] = {
        provider: element.getAttribute('data-cite-provider') ?? '',
        url: element.getAttribute('data-cite-url') ?? '',
      }
    }

    const enriched = await enrichCiteFn(cites)

    for (let i = 0; i < count; i++) {
      const data = enriched.get(cites[i].url)

      if (!data) {
        continue
      }

      // Enrichment payloads carry dates in whatever form the platform's API serves, so the
      // same parse-else-keep rule as convertCiteCards applies before the attribute is written.
      const date = data.date ? (parseDateFn?.(data.date) ?? data.date) : undefined

      updateCitePlaceholder(placeholders[i] as HTMLElement, date ? { ...data, date } : data)
    }
  }
}
