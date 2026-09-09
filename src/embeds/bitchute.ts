import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^[a-zA-Z0-9]+$/

const bitchuteHosts = ['bitchute.com']

const bitchuteResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const [route, id] = getPathSegments(link)

  if (route !== 'embed' && route !== 'video') {
    return
  }

  const videoId = keepIfMatches(id, safeVideoIdRegex)

  if (!videoId) {
    return
  }

  const title = attr(element, 'title')

  return {
    provider: 'bitchute',
    id: videoId,
    src: `https://www.bitchute.com/embed/${videoId}/`,
    url: `https://www.bitchute.com/video/${videoId}/`,
    title,
  }
}

// BitChute's player iframe on the www and the old host, carrying only a title.
export const bitchuteEmbedResolver = createUrlEmbedResolver(bitchuteHosts, bitchuteResolveEmbed)
