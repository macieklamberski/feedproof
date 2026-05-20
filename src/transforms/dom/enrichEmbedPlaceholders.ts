import { applyEmbedMetadata } from '../../common.js'
import type { DomTransform, EmbedResolverResult } from '../../types.js'

export const enrichEmbedPlaceholders: DomTransform = (context) => {
  const enrichEmbedFn = context.enrichEmbedFn

  if (!enrichEmbedFn) {
    return () => {}
  }

  return async (document) => {
    const placeholders = document.querySelectorAll('[data-embed-provider][data-embed-id]')
    const count = placeholders.length

    if (!count) {
      return
    }

    const embeds: Array<{ provider: string; id: string }> = new Array(count)
    for (let i = 0; i < count; i++) {
      const element = placeholders[i]

      embeds[i] = {
        provider: element.getAttribute('data-embed-provider') ?? '',
        id: element.getAttribute('data-embed-id') ?? '',
      }
    }

    let enriched: Map<string, Partial<EmbedResolverResult>>
    try {
      enriched = await enrichEmbedFn(embeds)
    } catch {
      return
    }

    for (let i = 0; i < count; i++) {
      const embed = embeds[i]
      const data = enriched.get(`${embed.provider}:${embed.id}`)

      if (data) {
        applyEmbedMetadata(placeholders[i] as HTMLElement, data, { setIfMissing: true })
      }
    }
  }
}
