import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// No width: a band measured off today's ids would refuse the ones BitChute mints next.
const safeVideoIdRegex = /^[a-zA-Z0-9]+$/

const bitchuteHosts = ['bitchute.com']

const bitchuteResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const [route, id] = getPathSegments(link)

  // The route word tells a video from a channel or a profile.
  if (route !== 'embed' && route !== 'video') {
    return
  }

  const videoId = keepIfMatches(id, safeVideoIdRegex)

  if (!videoId) {
    return
  }

  const title = attr(element, 'title')

  // The cover image sits under the channel's hash, which the video url does not carry, and
  // `api.bitchute.com/oembed/?url={page}` answers with it, the title and the channel, key-free.
  return {
    provider: 'bitchute',
    id: videoId,
    src: `https://www.bitchute.com/embed/${videoId}/`,
    url: `https://www.bitchute.com/video/${videoId}/`,
    title,
  }
}

// BitChute's player iframe on the www and the old host, carrying only a title.
// No render hint: the player reads `autoPlay` off its query, then gates `play()` on an unmuted
// autoplay probe and sits on its poster.
export const bitchuteEmbedResolver = createUrlEmbedResolver(bitchuteHosts, bitchuteResolveEmbed)
