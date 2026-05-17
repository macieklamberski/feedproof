import { applyEmbedMetadata } from '../../common.js'
import type { DomTransform, EmbedResolverResult } from '../../types.js'

export const enrichEmbedPlaceholders: DomTransform = (context) => {
  return async (document) => {
    if (!context.enrichEmbedFn) {
      return
    }

    const placeholders = Array.from(
      document.querySelectorAll('[data-embed-provider][data-embed-id]'),
    )

    if (!placeholders.length) {
      return
    }

    const embeds = placeholders.map((element) => ({
      provider: element.getAttribute('data-embed-provider') ?? '',
      id: element.getAttribute('data-embed-id') ?? '',
    }))

    let enriched: Map<string, Partial<EmbedResolverResult>>
    try {
      enriched = await context.enrichEmbedFn(embeds)
    } catch {
      return
    }

    for (const element of placeholders) {
      const provider = element.getAttribute('data-embed-provider')
      const id = element.getAttribute('data-embed-id')
      const data = enriched.get(`${provider}:${id}`)

      if (data) {
        applyEmbedMetadata(element as HTMLElement, data, { setIfMissing: true })
      }
    }
  }
}
