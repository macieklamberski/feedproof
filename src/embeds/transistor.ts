import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[0-9a-z]+$/i
// A show slug is the publisher's own words, so it hyphenates where an episode id never does.
const safeSlugRegex = /^[0-9a-z][0-9a-z-]*$/i

const transistorHosts = ['transistor.fm']

// The episode player is fixed at 180, and Transistor's own oEmbed agrees. A `/latest` player holds
// one episode and `/playlist` the whole show.
const playerHeights = { e: 180, latest: 180, playlist: 390 }

// What a placeholder's id names, which has to address the endpoint on its own for enrichment.
const subjectNames = { e: 'episode', latest: 'latest', playlist: 'playlist' }

// `/e/{slug}/latest` is the newest episode of a show and `/e/{slug}/playlist` the whole show.
// Every other trailing segment, `/dark` among them, is a display option on an episode id.
const showModes = ['latest', 'playlist'] as const

type Subject = { kind: keyof typeof playerHeights; id: string }

export const extractTransistorEmbed = (link: string): Subject | undefined => {
  const segments = getPathSegments(link)
  const kind = segments[0]
  const subject = segments[1]

  if ((kind !== 'e' && kind !== 's') || !subject) {
    return
  }

  const mode = showModes.find((named) => named === segments[2])

  if (kind === 'e' && mode) {
    return safeSlugRegex.test(subject) ? { kind: mode, id: subject } : undefined
  }

  // A share page is `/s/{id}` and takes nothing after it. A third segment is a transcript:
  // Transistor writes sidecars at `/s/{id}/{token}.{ext}`.
  if (kind === 's' && segments[2]) {
    return
  }

  return safeIdRegex.test(subject) ? { kind: 'e', id: subject } : undefined
}

export const transistorResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractTransistorEmbed(url)

  if (!embed) {
    return
  }

  // Dropping the mode mints /e/{slug}, an episode by a show's name, which answers 404.
  const path = embed.kind === 'e' ? `e/${embed.id}` : `e/${embed.id}/${embed.kind}`

  return {
    provider: 'transistor',
    id: `${subjectNames[embed.kind]}/${embed.id}`,
    src: `https://share.transistor.fm/${path}`,
    // A show mode has no page: the embed slug is not the show's subdomain, which 404s.
    // `/s/{id}` is the same episode's share page, which answers under `frame-ancestors 'self'`.
    ...(embed.kind === 'e' && { url: `https://share.transistor.fm/s/${embed.id}` }),
    height: playerHeights[embed.kind],
  }
}

// A Transistor player iframe, or a frame of the share page, which refuses framing.
export const transistorEmbedResolver = createUrlEmbedResolver(
  transistorHosts,
  transistorResolveEmbed,
)
