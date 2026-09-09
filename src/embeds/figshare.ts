import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const figshareHosts = ['figshare.com']
const widgetPathRegex = /^\/articles\/(\d+)\/embed\/?$/

export const figshareResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, figshareHosts)
  const articleId = parsed?.pathname.match(widgetPathRegex)?.[1]

  if (!parsed || !articleId) {
    return
  }

  return {
    provider: 'figshare',
    id: articleId,
    src: url,
  }
}

// figshare's article widget iframe at /articles/{id}/embed.
export const figshareEmbedResolver = createUrlEmbedResolver(figshareHosts, figshareResolveEmbed)
