import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { isMediaFile } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'podbean'

// Ids are a slug pair, e.g. `yx4hr-f3d1e1`, and the v2 player appends `-pb` to its own.
const safeIdRegex = /^[a-z0-9]+-[a-z0-9]+(?:-pb)?$/i

const podbeanHosts = ['podbean.com']

// The v2 player's height, which is what both url forms end up rendering and what nearly every
// `player-v2` embed carries, while the legacy markup states 122 for a player Podbean no longer
// serves. Where the url spells `size=` it wins.
const defaultPlayerHeight = 150

export const extractPodbeanId = (link: string): string | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  // Podbean serves the episode audio from the same domain as the players, and a query on a media
  // url belongs to whoever published it, not to the player: an `?i=` beside an mp3 reads as an id
  // and the enclosure loses its audio element to a placeholder.
  if (!parsed || isMediaFile(parsed.pathname)) {
    return
  }

  const segments = getPathSegments(parsed)
  // `/media/player/{id}` is the legacy form, `/player-v2/?i={id}` the current one.
  const id =
    segments[0] === 'media' && segments[1] === 'player'
      ? segments[2]
      : (parsed.searchParams.get('i') ?? undefined)

  return keepIfMatches(id, safeIdRegex)
}

// Podbean serves one player behind two urls: `/media/player/{id}` 301s to
// `/player-v2/?…&i={id}-pb`, marking the migration with `from=old_player`. Minting the v2 form
// therefore repairs a legacy url and saves the reader a redirect. Checked live 2026-08-11 with
// a real id: `/media/player/yx4hr-f3d1e1` answers 301 to `…&i=yx4hr-f3d1e1-pb`, and an invented
// id answers 404, so the redirect validates the id and names the exact target. A status code
// off the v2 player proves nothing by itself, since it answers 200 to any id.
//
// No metadata worth having. `api.podbean.com/v1/oembed` does answer key-free, but its whole
// payload is `version, provider_name, provider_url, width, height, type, html`: no title, no
// thumbnail, no author (checked 2026-08-11). So height and the repaired url are what this
// resolver is for, and enrichment would add nothing.
export const podbeanResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const id = extractPodbeanId(url)

  if (!id) {
    return
  }

  const stated = parseUrl(url, 'https://example.com')?.searchParams.get('size')
  const height = parsePixelSize(stated) ?? defaultPlayerHeight

  return {
    provider,
    id,
    src: `https://www.podbean.com/player-v2/?i=${id}`,
    height,
  }
}

export const podbeanEmbedResolver = createUrlEmbedResolver(podbeanHosts, podbeanResolveEmbed)

// The player takes no query to start; it speaks player.js.
export const podbeanRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
