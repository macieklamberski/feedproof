import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `playerivoox_ee_`, `_ep_` and `_em_` are three generations of the legacy episode player, and
// all of them name the episode by the same numeric id.
const legacyPlayerRegex = /\/playerivoox_e[emp]_(\d+)_\d+\.html$/
// Enumerated, not `e[a-z]`: `player_el_` answers 404 while `ej` and `ek` serve.
// `player_ej_` and `player_ek_` are two live generations of the current player.
const episodePlayerRegex = /\/player_e[jk]_(\d+)(?:_(\d+))?_(\d+)\.html$/

// The show player, which carries every episode. Its id is the podcast's, a different id space
// from an episode's, so it cannot share the episode kind.
const showPlayerRegex = /\/player_es_podcast_(\d+)(?:_(\d+))?_(\d+)\.html$/

const ivooxHosts = ['ivoox.com']

// What most iframes on the current player state. The rest are 120, which looks like a compact
// skin. A size in the markup wins over this, so it only applies where the publisher stated
// none.
const playerHeight = 200

export type IvooxSubject = {
  kind: 'episode' | 'show'
  id: string
  // The skin picks the episode player's layout, the page which episode a show's playlist opens on.
  skin: string
  page: string
  player: string
}

export const extractIvooxSubject = (link: string): IvooxSubject | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed) {
    return
  }

  const show = parsed.pathname.match(showPlayerRegex)

  if (show?.[1]) {
    return {
      kind: 'show',
      id: show[1],
      skin: show[2] ?? '1',
      page: show[3],
      player: 'es_podcast',
    }
  }

  const episode = parsed.pathname.match(episodePlayerRegex)

  if (episode?.[1]) {
    // The generation stays: `ek` serves, and rewriting it to `ej` swaps in a different player.
    const player = episode[0].startsWith('/player_ek_') ? 'ek' : 'ej'

    return { kind: 'episode', id: episode[1], skin: episode[2] ?? '1', page: episode[3], player }
  }

  // The three generations share one id space: `ivoox.com/x_rf_{id}_1.html` redirects to the
  // episode's own page for a legacy id and 404s for a fabricated one.
  const legacy = parsed.pathname.match(legacyPlayerRegex)

  return legacy?.[1]
    ? { kind: 'episode', id: legacy[1], skin: '1', page: '1', player: 'ej' }
    : undefined
}

// iVoox's player iframes, whose legacy `playerivoox_` generation now answers 404 for every id.
// `player_ej_` answers 200 to any id at all, a javascript shell that resolves the id on load.
export const ivooxResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const subject = extractIvooxSubject(url)

  if (!subject) {
    return
  }

  // No thumbnail or title: iVoox publishes no key-free metadata endpoint for an episode id.
  return {
    provider: 'ivoox',
    id: subject.kind === 'show' ? `podcast/${subject.id}` : subject.id,
    src: `https://www.ivoox.com/player_${subject.player}_${subject.id}_${subject.skin}_${subject.page}.html`,
    height: playerHeight,
  }
}

export const ivooxEmbedResolver = createUrlEmbedResolver(ivooxHosts, ivooxResolveEmbed)
