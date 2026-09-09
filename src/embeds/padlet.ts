import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeBoardIdRegex = /^[a-z0-9]+$/

const padletHosts = ['padlet.com']
const embedPathRegex = /^\/embed\/([^/]+)\/?$/
const previewPathRegex = /^\/padlets\/([^/]+)\/embeds\/preview_embed\/?$/

const boardHeight = 608

export const padletResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, padletHosts)
  const boardId =
    parsed?.pathname.match(embedPathRegex)?.[1] ?? parsed?.pathname.match(previewPathRegex)?.[1]

  if (!boardId || !safeBoardIdRegex.test(boardId)) {
    return
  }

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
