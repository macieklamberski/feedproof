import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const figshareHost = 'figshare.com'
const widgetPathRegex = /^\/articles\/(\d+)\/embed\/?$/

// The widget host answers an identical shell for any article id, so the id is checked through
// `api.figshare.com/v2/articles/{id}`, which needs no key: 200 with the title, the authors, the
// files and a poster for a real id, 404 for a fabricated one (2026-09-06). The article's page
// lives on whichever institutional portal published it and only that API names it, so no page
// url is minted. The widget fills the box it is given; the share code sizes it 568x351.
export const figshareResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, figshareHost)
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

export const figshareEmbedResolver = createUrlEmbedResolver([figshareHost], figshareResolveEmbed)
