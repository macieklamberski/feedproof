import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The view id is a dashless 24-character hex id.
const safeViewIdRegex = /^[0-9a-f]{24}$/i

const geniallyHosts = ['genially.com', 'genial.ly']

// Genially publishes interactive presentations, embedded on the old `view.genial.ly` host and
// on `view.genially.com` alike. The iframe renders either way, so this is not a repair of dead
// markup. What it does is spare the reader a redirect and give the embed a name.
//
// `view.genial.ly/{id}` answers 301 to `view.genially.com/{id}`, the same id on the new host,
// so unlike a legacy id space this rewrite is computable. It is checkable too: a real id
// answers 200 on the modern host and an invented one 302s away (checked 2026-08-13).
//
// No thumbnail offline. The page carries an `og:image` on `thumbnails.genially.com`, but its
// path is keyed by ids that appear nowhere in the embed url, so a poster needs a fetch. Tagging
// provider and id here is what gives that fetch something to attach to later.
export const extractGeniallyViewId = (link: string): string | undefined => {
  const segments = getPathSegments(link)
  const viewId = segments[0] === 'view' ? segments[1] : segments[0]

  return keepIfMatches(viewId, safeViewIdRegex)
}

export const geniallyResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const viewId = extractGeniallyViewId(url)

  if (!viewId) {
    return
  }

  return {
    provider: 'genially',
    id: viewId,
    src: `https://view.genially.com/${viewId}`,
  }
}

export const geniallyEmbedResolver = createUrlEmbedResolver(geniallyHosts, geniallyResolveEmbed)
