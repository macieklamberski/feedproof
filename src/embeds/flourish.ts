import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// Every corpus embed points at the relative `visualisation/{numeric id}` path, at most
// with a cache-busting query. Only the digits reach the minted URLs; a full URL or any
// other path shape is dropped.
const visualisationSrcRegex = /^visualisation\/(\d+)(?:\?.*)?$/

// Flourish ships a chart as `<div class="flourish-embed" data-src="visualisation/{id}">`
// plus an SDK script that builds the iframe at runtime, so a reader shows nothing at all.
// The embed page is mintable from the id alone (verified live, 200), and so is the public
// share page the placeholder anchors to. The div usually wraps a static thumbnail img
// (bare or inside a <noscript>); when present it becomes the placeholder's thumbnail.
export const flourishEmbedResolver: EmbedResolver = {
  selector: 'div.flourish-embed[data-src]',
  extract: (element): EmbedResolverResult | undefined => {
    const match = attr(element, 'data-src')?.match(visualisationSrcRegex)
    const visualisationId = match?.[1]

    if (!visualisationId) {
      return
    }

    const result: EmbedResolverResult = {
      provider: 'flourish',
      id: visualisationId,
      src: `https://flo.uri.sh/visualisation/${visualisationId}/embed`,
      url: `https://public.flourish.studio/visualisation/${visualisationId}/`,
    }

    const thumbnail = attr(element.querySelector('img'), 'src')

    if (thumbnail) {
      return { ...result, thumbnail }
    }

    return result
  },
}
