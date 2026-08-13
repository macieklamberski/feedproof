import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createIframeEmbedResolver, createMarkupEmbedResolver } from '../utils/widgets.js'

const fileExtensionRegex = /\.[a-z]+$/i
const safeMediaIdRegex = /^[a-zA-Z0-9]{8}$/

const jwplayerHosts = ['jwplayer.com', 'jwplatform.com']

export const extractJwplayerId = (link: string): string | undefined => {
  const lastSegment = getPathSegments(link).at(-1)

  if (!lastSegment) {
    return
  }

  // Embed URLs end in `{mediaId}-{playerId}.html`. The media id is the part before the
  // first dash, with the file extension dropped.
  const mediaId = lastSegment.replace(fileExtensionRegex, '').split('-')[0]

  if (mediaId && safeMediaIdRegex.test(mediaId)) {
    return mediaId
  }
}

export const jwplayerResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const mediaId = extractJwplayerId(url)

  if (!mediaId) {
    return
  }

  return {
    provider: 'jwplayer',
    id: mediaId,
    // Rebuilt from the id, so the empty player-id segment some feeds ship
    // (`{mediaId}-.html`, which 404s) is dropped and the URL loads the default player.
    // JW Player has no public watch page, so no `url` — the placeholder anchors to the src.
    src: `https://cdn.jwplayer.com/players/${mediaId}.html`,
    thumbnail: `https://cdn.jwplayer.com/v2/media/${mediaId}/poster.jpg`,
  }
}

export const jwplayerIframeEmbedResolver = createIframeEmbedResolver(
  jwplayerHosts,
  jwplayerResolveEmbed,
)

// The script embed ships the same `{mediaId}-{playerId}` pair beside an empty `botr_` div,
// so a reader shows nothing until it is resolved. It names a player, so it becomes the same
// placeholder as the iframe form, through the same id extraction.
export const jwplayerScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="jwplayer.com/players/"], script[src*="jwplatform.com/players/"]',
  (element) => {
    const src = attr(element, 'src') ?? ''
    const url = parseUrl(src, 'https://example.com')

    if (!url || (!isHostOf(url, jwplayerHosts) && !isSubdomainOf(url, jwplayerHosts))) {
      return
    }

    return jwplayerResolveEmbed(src)
  },
)
