import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, findConfigScript, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const fileExtensionRegex = /\.[a-z]+$/i

// Letters and digits, which is the whole of what a media id is written in. The length is not
// checked: the id sits at a fixed position in every carrier, before the first dash of the file
// name or after `/v2/media/` in a setup call, so no route word can land there, and a wrong id
// fails the same whether it is minted or passed through. JW has minted eight characters so far,
// and a bound on that would refuse the next id space silently.
const safeMediaIdRegex = /^[a-zA-Z0-9]+$/

const jwplayerHosts = ['jwplayer.com', 'jwplatform.com']

export const extractJwplayerId = (link: string): string | undefined => {
  const lastSegment = getPathSegments(link).at(-1)

  if (!lastSegment) {
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
// media in `data-media-id` beside the account's `data-player-id`. The player id only picks a
// skin, so the media id alone rebuilds the same player page as the other two forms.
// A playlist is named by `data-playlist-id`, and AMP's own builder gives it precedence over the
// media id when both are present, so the same order is followed here.
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

// The fourth carrier: an empty `<div class="jwplayer">` beside an inline `jwplayer(...).setup()`
// call. Nothing here names the media in the markup, so without reading the script the div is
// deleted as an empty tag and the video is gone. The setup object points its playlist at
// `cdn.jwplayer.com/v2/media/{mediaId}`, which is the same id the other carriers name, so all
// four resolve to one placeholder.
const setupPlaylistRegex = /\/v2\/media\/([a-zA-Z0-9]+)/

export const jwplayerSetupEmbedResolver = createMarkupEmbedResolver('div.jwplayer', (element) => {
  const config = findConfigScript(element)?.textContent
  const mediaId = config?.match(setupPlaylistRegex)?.[1]

  if (!mediaId || !safeMediaIdRegex.test(mediaId)) {
    return
  }

  return composeJwplayerEmbed(mediaId)
})
