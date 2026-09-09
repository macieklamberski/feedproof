import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const legacyPlayerRegex = /\/playerivoox_e[emp]_(\d+)_\d+\.html$/
const episodePlayerRegex = /\/player_e[jk]_(\d+)(?:_(\d+))?_(\d+)\.html$/

const showPlayerRegex = /\/player_es_podcast_(\d+)(?:_(\d+))?_(\d+)\.html$/

const ivooxHosts = ['ivoox.com']

const playerHeight = 200

export type IvooxSubject = {
  kind: 'episode' | 'show'
  id: string
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
    const player = episode[0].startsWith('/player_ek_') ? 'ek' : 'ej'

    return { kind: 'episode', id: episode[1], skin: episode[2] ?? '1', page: episode[3], player }
  }

  const legacy = parsed.pathname.match(legacyPlayerRegex)

  return legacy?.[1]
    ? { kind: 'episode', id: legacy[1], skin: '1', page: '1', player: 'ej' }
    : undefined
}

// iVoox's player iframes, whose legacy `playerivoox_` generation now answers 404 for every id.
export const ivooxResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const subject = extractIvooxSubject(url)

  if (!subject) {
    return
  }

  return {
    provider: 'ivoox',
    id: subject.kind === 'show' ? `podcast/${subject.id}` : subject.id,
    src: `https://www.ivoox.com/player_${subject.player}_${subject.id}_${subject.skin}_${subject.page}.html`,
    height: playerHeight,
  }
}

export const ivooxEmbedResolver = createUrlEmbedResolver(ivooxHosts, ivooxResolveEmbed)
