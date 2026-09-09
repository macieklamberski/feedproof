import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const standfmHosts = ['stand.fm']

const safeIdRegex = /^[0-9a-f]{24}$/
const playerKindRegex = /^[a-z]+$/

const episodePlayerHeight = 190

// stand.fm's player iframe, or a framed page url, which answers SAMEORIGIN and shows nothing.
export const standfmResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, placeholderBaseUrl)
  const segments = parsed ? getPathSegments(parsed) : []
  const [kind, id] = segments[0] === 'embed' ? segments.slice(1) : segments

  if (!kind || !playerKindRegex.test(kind) || !id || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'standfm',
    id: `${kind}/${id}`,
    src: `https://stand.fm/embed/${kind}/${id}`,
    url: `https://stand.fm/${kind}/${id}`,
    ...(kind === 'episodes' && { height: episodePlayerHeight }),
  }
}

export const standfmEmbedResolver = createUrlEmbedResolver(standfmHosts, standfmResolveEmbed)
