import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Padlet serves nothing but a board behind /embed/: dashboard and its siblings answer 404 there.
// The enclosure probe offers every attachment a feed carries to this resolver.
const safeBoardIdRegex = /^[a-z0-9]+$/

const padletHosts = ['padlet.com']
const embedPathRegex = /^\/embed\/([^/]+)\/?$/
const previewPathRegex = /^\/padlets\/([^/]+)\/embeds\/preview_embed\/?$/

// The share code sizes the board `height: 608px` at full width, and nearly every carrier
// repeats that; the preview form sizes itself `height: 100%` and so states nothing usable.
const boardHeight = 608

export const padletResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, padletHosts)
  const boardId =
    parsed?.pathname.match(embedPathRegex)?.[1] ?? parsed?.pathname.match(previewPathRegex)?.[1]

  if (!boardId || !safeBoardIdRegex.test(boardId)) {
    return
  }

  // The social preview answers 200 image/jpeg for any id, a placeholder for a fabricated one, and
  // the embed route 404s it. The board page is padlet.com/{user}/{slug}-{id}, and neither half is
  // in the embed url.
  return {
    provider: 'padlet',
    id: boardId,
    src: `https://padlet.com/embed/${boardId}`,
    thumbnail: `https://padlet.net/social-previews/board/${boardId}/opengraph.jpg`,
    height: boardHeight,
  }
}

// The padlet.com/embed/{board} iframe, and its preview form, which sizes itself height: 100%.
export const padletEmbedResolver = createUrlEmbedResolver(padletHosts, padletResolveEmbed)
