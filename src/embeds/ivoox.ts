import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `playerivoox_ee_`, `_ep_` and `_em_` are three generations of the legacy episode player, and
// `player_ej_` and `player_ek_` are two live generations of the current one. All of them name
// the episode by the same numeric id. `player_ek_` also appears without the skin segment.
//
// The letters are enumerated rather than matched as a shape, because they are not a sequence:
// `player_el_` and `player_en_podcast_` both answer 404 while `ej`, `ek` and `es_podcast` serve
// (probed 2026-08-15 with real ids). A `player_e[a-z]_` pattern would mint dead urls.
const legacyPlayerRegex = /playerivoox_e[emp]_(\d+)_\d+\.html/
const episodePlayerRegex = /player_e[jk]_(\d+)(?:_(\d+))?_\d+\.html/

// The show player, which carries every episode. Its id is the podcast's, a different id space
// from an episode's, so it cannot share the episode kind.
const showPlayerRegex = /player_es_podcast_(\d+)(?:_\d+)?_\d+\.html/

const ivooxHosts = ['ivoox.com']

// What most iframes on the current player state. The rest are 120, which looks like a compact
// skin. A size in the markup wins over this, so it only applies where the publisher stated
// none.
const playerHeight = 200

export type IvooxSubject = { kind: 'episode' | 'show'; id: string; skin: string; player: string }

export const extractIvooxSubject = (link: string): IvooxSubject | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const show = parsed.pathname.match(showPlayerRegex)

  if (show?.[1]) {
    return { kind: 'show', id: show[1], skin: '1', player: 'es_podcast' }
  }

  const episode = parsed.pathname.match(episodePlayerRegex)

  if (episode?.[1]) {
    // The generation the publisher chose is kept: `ek` serves, so rewriting it to `ej` would
    // swap a working player for a different one on nothing but preference.
    const player = episode[0].startsWith('player_ek_') ? 'ek' : 'ej'

    return { kind: 'episode', id: episode[1], skin: episode[2] ?? '1', player }
  }

  const legacy = parsed.pathname.match(legacyPlayerRegex)

  return legacy?.[1] ? { kind: 'episode', id: legacy[1], skin: '1', player: 'ej' } : undefined
}

// The legacy player is gone: `playerivoox_ee_8292430_1.html` and `playerivoox_ep_1617339_1.html`
// answer 404 with the same 80,237-byte "page does not exist" body, whichever generation and
// whichever id, so rewriting is a repair and those embeds render nothing today. The three
// generations share one id space, which is what lets the rewrite carry the id across:
// `ivoox.com/x_rf_{id}_1.html` redirects to the episode's own slugged page for a real id and
// 404s for a fabricated one, and it answered with the episode named in the same snippet for
// fourteen of nineteen legacy ids probed 2026-09-06, across all three generations. The current
// form is not verifiable the same way, since
// `player_ej_` answers 200 to any id at all: it is a javascript shell that resolves the id on
// load. What the rewrite rests on is the 404 and the shared id, not a status code off the
// target. The skin segment is carried through when the source states one.
//
// No thumbnail or title: iVoox publishes no key-free metadata endpoint for an episode id.
export const ivooxResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const subject = extractIvooxSubject(url)

  if (!subject) {
    return
  }

  return {
    provider: 'ivoox',
    id: subject.kind === 'show' ? `podcast/${subject.id}` : subject.id,
    src: `https://www.ivoox.com/player_${subject.player}_${subject.id}_${subject.skin}_1.html`,
    height: playerHeight,
  }
}

export const ivooxEmbedResolver = createUrlEmbedResolver(ivooxHosts, ivooxResolveEmbed)
