import { getPathSegments, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The view id is a dashless 24-character hex id.
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

  // No thumbnail offline: the page's `og:image` on `thumbnails.genially.com` is keyed by ids that
  // appear nowhere in the embed url.
  return {
    provider: 'genially',
    id: viewId,
    // `view.genial.ly/{id}` answers 301 to `view.genially.com/{id}`, where a real id answers 200
    // and an invented one 302s away.
    src: `https://view.genially.com/${viewId}`,
    ...trimObject({ title }, Boolean),
  }
}

export const geniallyEmbedResolver = createUrlEmbedResolver(geniallyHosts, geniallyResolveEmbed)
