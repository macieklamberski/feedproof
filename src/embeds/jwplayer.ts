import { getPathSegments, isAnyOf } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, findConfigScript, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const fileExtensionRegex = /\.[a-z]+$/i

const safeMediaIdRegex = /^[a-zA-Z0-9]+$/

const jwplayerHosts = ['jwplayer.com', 'jwplatform.com']

const playerRoutes = ['players', 'previews']

export const extractJwplayerId = (link: string): string | undefined => {
  const [route, lastSegment] = getPathSegments(link).slice(-2)

  if (!lastSegment || !isAnyOf(route ?? '', playerRoutes)) {
    return
  }

  const mediaId = lastSegment.replace(fileExtensionRegex, '').split('-')[0]

  return keepIfMatches(mediaId, safeMediaIdRegex)
}

const composeJwplayerEmbed = (id: string, isPlaylist = false): EmbedResolverResult => {
  return {
    provider: 'jwplayer',
    id: isPlaylist ? `playlist/${id}` : id,
    src: `https://cdn.jwplayer.com/players/${id}.html`,
    ...(!isPlaylist && { thumbnail: `https://cdn.jwplayer.com/v2/media/${id}/poster.jpg` }),
  }
}

export const jwplayerResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const mediaId = extractJwplayerId(url)

  if (!mediaId) {
    return
  }

  return composeJwplayerEmbed(mediaId)
}

// A JW Player iframe, players/{mediaId}-{playerId}.html, some with an empty player id that 404s.
export const jwplayerIframeEmbedResolver = createUrlEmbedResolver(
  jwplayerHosts,
  jwplayerResolveEmbed,
)

// JW Player's script embed: the same players/{mediaId}-{playerId} url beside an empty botr_ div.
export const jwplayerScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="jwplayer.com/players/"], script[src*="jwplatform.com/players/"]',
  (element) => {
    const src = attr(element, 'src') ?? ''

    if (!parseUrlOnHosts(src, jwplayerHosts)) {
      return
    }

    return jwplayerResolveEmbed(src)
  },
)

// AMP's amp-jwplayer element, which renders nothing without the AMP runtime.
export const jwplayerAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-jwplayer[data-media-id], amp-jwplayer[data-playlist-id]',
  (element) => {
    const playlistId = attr(element, 'data-playlist-id')
    const id = playlistId ?? attr(element, 'data-media-id')

    if (!id || !safeMediaIdRegex.test(id)) {
      return
    }

    return composeJwplayerEmbed(id, !!playlistId)
  },
)

const setupPlaylistRegex = /\/v2\/media\/([a-zA-Z0-9]+)/

// An empty div.jwplayer beside an inline jwplayer(...).setup() call, stripped as an empty tag.
export const jwplayerSetupEmbedResolver = createMarkupEmbedResolver('div.jwplayer', (element) => {
  const config = findConfigScript(element)?.textContent
  const mediaId = config?.match(setupPlaylistRegex)?.[1]

  if (!mediaId || !safeMediaIdRegex.test(mediaId)) {
    return
  }

  return composeJwplayerEmbed(mediaId)
})
