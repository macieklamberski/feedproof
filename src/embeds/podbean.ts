import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parsePixelSize } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Ids are a slug pair, e.g. `yx4hr-f3d1e1`, and the v2 player appends `-pb` to its own.
const safeIdRegex = /^[a-z0-9]+-[a-z0-9]+(?:-pb)?$/i

const podbeanHosts = ['podbean.com']

// The v2 player's height, which is what both url forms end up rendering. Sampled from the
// corpus: `player-v2` embeds carry 150 in 10 of 11 cases, while the legacy markup states 122
// for a player Podbean no longer serves. Where the url spells `size=` it wins.
const defaultPlayerHeight = 150

export const extractPodbeanId = (link: string): string | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  // `/media/player/{id}` is the legacy form, `/player-v2/?i={id}` the current one.
  const id =
    segments[0] === 'media' && segments[1] === 'player'
      ? segments[2]
      : (parsed.searchParams.get('i') ?? undefined)

  if (id && safeIdRegex.test(id)) {
    return id
  }
}

// Podbean serves one player behind two urls: `/media/player/{id}` **301s to**
// `/player-v2/?…&i={id}-pb`, marking the migration with `from=old_player`. Minting the v2 form
// therefore repairs a legacy url and saves the reader a redirect. Checked live 2026-08-11 with
// a real id: `/media/player/yx4hr-f3d1e1` answers 301 to `…&i=yx4hr-f3d1e1-pb`, and an invented
// id answers 404, so the redirect validates the id and names the exact target. A status code
// off the v2 player proves nothing by itself, since it answers 200 to any id.
//
// No metadata worth having. `api.podbean.com/v1/oembed` does answer key-free, but its whole
// payload is `version, provider_name, provider_url, width, height, type, html` — no title, no
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
    provider: 'podbean',
    id,
    src: `https://www.podbean.com/player-v2/?i=${id}`,
    height,
  }
}

export const podbeanEmbedResolver = createUrlEmbedResolver(podbeanHosts, podbeanResolveEmbed)
