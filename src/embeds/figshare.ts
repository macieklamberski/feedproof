import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const figshareHosts = ['figshare.com']
const widgetPathRegex = /^\/articles\/(\d+)\/embed\/?$/

// The widget host answers the same shell for any article id. `api.figshare.com/v2/articles/{id}`
// answers 200 with the title, the authors, the files and a poster for a real id and 404 for a
// fabricated one, with no key.
export const figshareResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, figshareHosts)
  const articleId = parsed?.pathname.match(widgetPathRegex)?.[1]

  if (!parsed || !articleId) {
    return
  }

  // No `url`: the article page lives on its institutional portal, which only the API names.
  // The widget fills the box it is given, and the share code sizes it 568x351.
  return {
    provider: 'figshare',
    id: articleId,
    src: url,
  }
}

// figshare's article widget iframe at /articles/{id}/embed.
export const figshareEmbedResolver = createUrlEmbedResolver(figshareHosts, figshareResolveEmbed)
