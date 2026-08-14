import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `playerivoox_ee_{id}_1.html` is the legacy player and `player_ej_{id}_{skin}_1.html` the
// current one. Both name the episode by the same numeric id.
const legacyPlayerRegex = /playerivoox_ee_(\d+)_\d+\.html/
const currentPlayerRegex = /player_ej_(\d+)_(\d+)_\d+\.html/

const ivooxHosts = ['ivoox.com']

// 200 in 26 of 34 sampled corpus iframes on the current player; the rest are 120, which looks
// like a compact skin. A size in the markup wins over this, so it only applies where the
// publisher stated none.
const playerHeight = 200

export const extractIvooxEpisode = (link: string): { id: string; skin: string } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const current = parsed.pathname.match(currentPlayerRegex)

  if (current?.[1] && current[2]) {
    return { id: current[1], skin: current[2] }
  }

  const legacy = parsed.pathname.match(legacyPlayerRegex)

  return legacy?.[1] ? { id: legacy[1], skin: '1' } : undefined
}

// The legacy player is gone: `playerivoox_ee_8292430_1.html` answers **404** with iVoox's own
// "page does not exist" body (checked 2026-08-11 across two ids), so rewriting is a repair and
// those embeds render nothing today. The current form is not verifiable the same way, since
// `player_ej_` answers 200 to any id at all: it is a javascript shell that resolves the id on
// load. What the rewrite rests on is the 404 and the shared id, not a status code off the
// target. The skin segment is carried through when the source states one.
//
// No thumbnail or title: iVoox publishes no key-free metadata endpoint for an episode id.
export const ivooxResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const episode = extractIvooxEpisode(url)

  if (!episode) {
    return
  }

  return {
    provider: 'ivoox',
    id: episode.id,
    src: `https://www.ivoox.com/player_ej_${episode.id}_${episode.skin}_1.html`,
    height: playerHeight,
  }
}

export const ivooxEmbedResolver = createUrlEmbedResolver(ivooxHosts, ivooxResolveEmbed)
