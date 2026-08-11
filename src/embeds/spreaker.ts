import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const spreakerHosts = ['spreaker.com']

// An episode player, or a show player that plays the latest episode.
const embedKinds = { episode_id: 'episode', show_id: 'show' } as const

// The height Spreaker documents in its own embed snippet (`height="200px"`), and the reason
// this resolver earns its place: the corpus iframes carry **no height attribute at all**, so
// without it a reader reserves nothing. Spreaker's oEmbed also returns title, author and a
// thumbnail, which the enrichment hook can fill once provider and id are tagged here.
const playerHeight = 200

export const extractSpreakerEmbed = (
  link: string,
): { kind: string; param: string; id: string } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || !parsed.pathname.includes('/player')) {
    return
  }

  for (const [param, kind] of Object.entries(embedKinds)) {
    const id = parsed.searchParams.get(param)

    if (id && safeIdRegex.test(id)) {
      return { kind, param, id }
    }
  }
}

export const spreakerResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractSpreakerEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider: 'spreaker',
    id: `${embed.kind}/${embed.id}`,
    src: `https://widget.spreaker.com/player?${embed.param}=${embed.id}`,
    height: playerHeight,
  }
}

export const spreakerEmbedResolver = createIframeEmbedResolver(spreakerHosts, spreakerResolveEmbed)
