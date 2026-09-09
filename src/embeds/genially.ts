import { getPathSegments, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeViewIdRegex = /^[0-9a-f]{24}$/i

const geniallyHosts = ['genially.com', 'genial.ly']

export const extractGeniallyViewId = (link: string): string | undefined => {
  const segments = getPathSegments(link)
  const viewId = segments[0] === 'view' ? segments[1] : segments[0]

  return keepIfMatches(viewId, safeViewIdRegex)
}

// Genially's presentation iframe, on the retired `view.genial.ly` host as often as the current one.
export const geniallyResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const viewId = extractGeniallyViewId(url)

  if (!viewId) {
    return
  }

  const title = attr(element, 'title')

  return {
    provider: 'genially',
    id: viewId,
    src: `https://view.genially.com/${viewId}`,
    ...trimObject({ title }, Boolean),
  }
}

export const geniallyEmbedResolver = createUrlEmbedResolver(geniallyHosts, geniallyResolveEmbed)
