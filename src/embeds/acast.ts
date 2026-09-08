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

// Every carrier form redirects to the one current player, and that player is 190 tall: Acast's
// share code writes `height="190px"` and its pages state `twitter:player:height` 190. Recent
// snippets agree, while the other heights feeds carry, 110 (mostly the retired
// `player.acast.com` host) and 120, sized players that no longer exist. So the resolver's
// height stands over what a carrier states.
const playerHeight = 190

// The three spellings a feed carries all redirect to the plain `embed.acast.com/{show}/{episode}`
// form (checked live 2026-08-15): the current embed code `embed.acast.com/$/{show}/{episode}`,
// the same path without the `$`, and the older `player.acast.com/{show}/episodes/{episode}`.
// A show alone on the embed host, with or without the `$`, is the playlist player.
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

export const acastEmbedResolver = createUrlEmbedResolver(acastHosts, acastResolveEmbed, {
  preferResolverSize: true,
})

// The player takes no query to start; it speaks player.js.
export const acastRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
