import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { isMediaFile, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'podbean'

// The `-pb` suffix is real: the v2 player appends it to its own ids.
const safeIdRegex = /^[a-z0-9]+-[a-z0-9]+(?:-pb)?$/i

const podbeanHosts = ['podbean.com']

// The v2 player renders 150 behind both url forms, and the legacy markup states 122 for a player
// Podbean retired.
const defaultPlayerHeight = 150

export const extractPodbeanId = (link: string): string | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  // Podbean serves the episode audio from the same domain as the players.
  // An mp3 on the host can carry a publisher's ?i=, and the enclosure would lose its audio.
  if (!parsed || isMediaFile(parsed.pathname)) {
    return
  }

  const segments = getPathSegments(parsed)
  // `/media/player/{id}` is the legacy form, `/player-v2/?i={id}` the current one.
  // /media/player/{id} 301s to /player-v2/?i={id}-pb for a real id and 404s an invented one, while
  // the v2 player answers 200 to any id.
  const id =
    segments[0] === 'media' && segments[1] === 'player'
      ? segments[2]
      : (parsed.searchParams.get('i') ?? undefined)

  return keepIfMatches(id, safeIdRegex)
}

export const podbeanResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const id = extractPodbeanId(url)

  if (!id) {
    return
  }

  const stated = parseUrl(url, placeholderBaseUrl)?.searchParams.get('size')
  const height = parsePixelSize(stated) ?? defaultPlayerHeight
  const title = attr(element, 'title')

  // api.podbean.com/v1/oembed answers key-free with no title, thumbnail or author, only the
  // player's html and size.
  return {
    provider,
    id,
    src: `https://www.podbean.com/player-v2/?i=${id}`,
    height,
    ...trimObject({ title }, Boolean),
  }
}

// The legacy podbean.com/media/player/{id} iframe, sized for a player Podbean no longer serves.
export const podbeanEmbedResolver = createUrlEmbedResolver(podbeanHosts, podbeanResolveEmbed)

// The player takes no query to start; it speaks player.js.
export const podbeanRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
