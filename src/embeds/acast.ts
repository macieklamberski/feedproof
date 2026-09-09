import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'acast'

// A show is a 24-hex object id, a UUID or the alias the publisher chose. An episode is an
// object id or a slug. Every form is one run of word characters and hyphens, so a single class
// covers them all and keeps `..` and `/` out of the minted path.
const safeIdRegex = /^[\w-]+$/

const acastHosts = ['embed.acast.com', 'player.acast.com']

// Acast's share code writes `height="190px"` and its pages state `twitter:player:height` 190.
const playerHeight = 190

// The three spellings all redirect to `embed.acast.com/{show}/{episode}`: the current embed code
// `embed.acast.com/$/{show}/{episode}`, the same path without the `$`, and the older
// `player.acast.com/{show}/episodes/{episode}`. A show alone is the playlist player.
const extractAcastEmbed = (link: string): { show: string; episode?: string } | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)
  const allSegments = parsed ? getPathSegments(parsed) : []
  const segments = allSegments[0] === '$' ? allSegments.slice(1) : allSegments
  const isPlayerHost = parsed?.hostname === 'player.acast.com'
  const show = segments[0]
  const episode = isPlayerHost ? segments[2] : segments[1]

  if (!show || !safeIdRegex.test(show)) {
    return
  }

  if (isPlayerHost && (segments[1] !== 'episodes' || !episode)) {
    return
  }

  if (episode !== undefined && !safeIdRegex.test(episode)) {
    return
  }

  return { show, episode }
}

const acastResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractAcastEmbed(url)

  if (!embed) {
    return
  }

  const path = embed.episode ? `${embed.show}/${embed.episode}` : embed.show

  return {
    provider,
    id: path,
    src: `https://embed.acast.com/${path}`,
    height: playerHeight,
  }
}

// Acast's player iframe, spelled three ways across the embed host and the retired player host.
export const acastEmbedResolver = createUrlEmbedResolver(acastHosts, acastResolveEmbed, {
  // Carriers state 110 and 120 for players that no longer exist, and the current one is 190.
  preferResolverSize: true,
})

// The player takes no query to start; it speaks player.js.
export const acastRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
