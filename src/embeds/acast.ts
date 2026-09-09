import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'acast'

const safeIdRegex = /^[\w-]+$/

const acastHosts = ['embed.acast.com', 'player.acast.com']

const playerHeight = 190

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
  preferResolverSize: true,
})

export const acastRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
