import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, findConfigScript } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

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

const composeJwplayerEmbed = (mediaId: string): EmbedResolverResult => {
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

export const jwplayerResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const mediaId = extractJwplayerId(url)

  if (!mediaId) {
    return
  }

  return composeJwplayerEmbed(mediaId)
}

export const jwplayerIframeEmbedResolver = createUrlEmbedResolver(
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

    if (!parseUrlOnHosts(src, jwplayerHosts)) {
      return
    }

    return jwplayerResolveEmbed(src)
  },
)

// AMP's own JW Player element, which renders nothing without the AMP runtime. It names the
// media in `data-media-id` beside the account's `data-player-id`; the player id only picks a
// skin, so the media id alone rebuilds the same player page as the other two forms.
export const jwplayerAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-jwplayer[data-media-id]',
  (element) => {
    const mediaId = attr(element, 'data-media-id')

    if (!mediaId || !safeMediaIdRegex.test(mediaId)) {
      return
    }

    return composeJwplayerEmbed(mediaId)
  },
)

// The third carrier: an empty `<div class="jwplayer">` beside an inline `jwplayer(...).setup()`
// call. Nothing here names the media in the markup, so without reading the script the div is
// deleted as an empty tag and the video is gone. The setup object points its playlist at
// `cdn.jwplayer.com/v2/media/{mediaId}`, which is the same id the other carriers name, so all
// four resolve to one placeholder.
const setupPlaylistRegex = /\/v2\/media\/([a-zA-Z0-9]{8})/

export const jwplayerSetupEmbedResolver = createMarkupEmbedResolver('div.jwplayer', (element) => {
  const config = findConfigScript(element)?.textContent
  const mediaId = config?.match(setupPlaylistRegex)?.[1]

  if (!mediaId || !safeMediaIdRegex.test(mediaId)) {
    return
  }

  return composeJwplayerEmbed(mediaId)
})
