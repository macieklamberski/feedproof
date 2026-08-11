import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[0-9a-z]{6,12}$/i

const transistorHosts = ['transistor.fm']

// Fixed at 180 across 49 of 49 sampled corpus iframes, and Transistor's own oEmbed agrees.
// The playlist embed is taller, so the two kinds are sized apart rather than averaged.
const playerHeights = { e: 180, s: 390 }

// `/e/{id}` is an episode and `/s/{id}` a show playlist; `/dark` and `/latest` are display
// options that follow the id.
export const extractTransistorEmbed = (
  link: string,
): { kind: 'e' | 's'; id: string } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const kind = segments[0]

  if ((kind !== 'e' && kind !== 's') || !segments[1] || !safeIdRegex.test(segments[1])) {
    return
  }

  return { kind, id: segments[1] }
}

export const transistorResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractTransistorEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider: 'transistor',
    id: `${embed.kind === 'e' ? 'episode' : 'show'}/${embed.id}`,
    src: `https://share.transistor.fm/${embed.kind}/${embed.id}`,
    height: playerHeights[embed.kind],
  }
}

export const transistorEmbedResolver = createIframeEmbedResolver(
  transistorHosts,
  transistorResolveEmbed,
)
