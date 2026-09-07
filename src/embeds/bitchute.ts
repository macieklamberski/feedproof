import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A video id is a run of letters and digits, twelve of them on every specimen seen.
const safeVideoIdRegex = /^[a-zA-Z0-9]{8,24}$/

const bitchuteHosts = ['bitchute.com']

// The player is `bitchute.com/embed/{id}/` and the page is `bitchute.com/video/{id}/`, both
// on `www` and on the `old` host the previous site keeps.
// Checked live 2026-08-16: the player answers 200 for a real id and 404 for an invented one.
//
// The cover image sits under the channel's hash, which the video url does not carry, so the
// poster is left to enrichment: `api.bitchute.com/oembed/?url=https://www.bitchute.com/video/{id}/`
// answers with it, the title and the channel, and needs no key. The WordPress oEmbed iframe
// states the title on the carrier and that one is read here.
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

export const bitchuteEmbedResolver = createUrlEmbedResolver(bitchuteHosts, bitchuteResolveEmbed)

// No autoplay hint. The player's script reads `autoPlay` off its query, then gates `play()` on an
// unmuted 250 ms autoplay probe, and loaded in Chrome by a click with `autoPlay=true` the player
// still sat on its poster. Not a hint until the player honours it.
