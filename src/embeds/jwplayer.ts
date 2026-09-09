import { getPathSegments, isAnyOf } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, findConfigScript, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const fileExtensionRegex = /\.[a-z]+$/i

// No length: JW has minted eight characters so far, and a bound would refuse the next id space.
const safeMediaIdRegex = /^[a-zA-Z0-9]+$/

const jwplayerHosts = ['jwplayer.com', 'jwplatform.com']

// `players` is the embed and `previews` its share page, and both serve the same player for the
// same id, 404 for a fabricated one. `cdn.jwplayer.com/videos/{id}-1280.mp4` is an enclosure.
const playerRoutes = ['players', 'previews']

export const extractJwplayerId = (link: string): string | undefined => {
  const [route, lastSegment] = getPathSegments(link).slice(-2)

  if (!lastSegment || !isAnyOf(route ?? '', playerRoutes)) {
    return
  }

  // Embed URLs end in `{mediaId}-{playerId}.html`. The media id is the part before the
  // first dash, with the file extension dropped.
  const mediaId = lastSegment.replace(fileExtensionRegex, '').split('-')[0]

  return keepIfMatches(mediaId, safeMediaIdRegex)
}

// The poster endpoint answers about a media and 404s for anything else, so a playlist id must
// not reach it. AMP's own component applies the same rule, rendering a placeholder image only
// when the element names a media.
const composeJwplayerEmbed = (id: string, isPlaylist = false): EmbedResolverResult => {
  return {
    provider: 'jwplayer',
    id: isPlaylist ? `playlist/${id}` : id,
    // Rebuilt from the id, so the empty player-id segment some feeds ship
    // (`{mediaId}-.html`, which 404s) is dropped and the URL loads the default player.
    // JW Player has no public watch page, so no `url`: the placeholder anchors to the src.
    src: `https://cdn.jwplayer.com/players/${id}.html`,
    // A playlist id 404s on the poster endpoint, so the thumbnail is gated on the kind.
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
// The player id in `data-player-id` only picks a skin, and AMP's own builder gives
// `data-playlist-id` precedence over the media id when both are present.
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

// The setup object points its playlist at `cdn.jwplayer.com/v2/media/{mediaId}`.
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
