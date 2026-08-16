import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[0-9a-z]{6,12}$/i
// A show slug is the publisher's own words rather than a generated id, so it runs longer and
// hyphenates. The leading class keeps a slug from opening with a hyphen or reaching a dot, so
// it cannot climb out of the minted path.
const safeSlugRegex = /^[0-9a-z][0-9a-z-]{1,60}$/i

const transistorHosts = ['transistor.fm']

// Fixed at 180 across 49 of 49 sampled corpus iframes, and Transistor's own oEmbed agrees.
// The playlist embed is taller, so the two kinds are sized apart rather than averaged. A
// `/latest` player holds one episode and matches the episode height. `/playlist` holds the
// whole show and matches the show one.
const playerHeights = { e: 180, s: 390, latest: 180, playlist: 390 }

// What a placeholder's id names, which has to address the endpoint on its own for enrichment.
const subjectNames = { e: 'episode', s: 'show', latest: 'latest', playlist: 'playlist' }

// A second segment naming a show mode is part of the subject, not decoration. `/e/{slug}/latest`
// is the newest episode of a show and `/e/{slug}/playlist` the whole show, so dropping the
// segment mints `/e/{slug}`, which asks for an episode by a show's name: checked live against
// Transistor's own examples, `/e/megamaker/latest` serves a 109 KB player while `/e/megamaker`
// answers 404. Every other trailing segment, `/dark` among them, really is a display option on
// an episode id and is discarded.
const showModes = ['latest', 'playlist'] as const

type Subject = { kind: keyof typeof playerHeights; id: string }

// `/e/{id}` is an episode and `/s/{id}` a show playlist.
export const extractTransistorEmbed = (link: string): Subject | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const kind = segments[0]
  const subject = segments[1]

  if ((kind !== 'e' && kind !== 's') || !subject) {
    return
  }

  const mode = showModes.find((named) => named === segments[2])

  if (kind === 'e' && mode) {
    return safeSlugRegex.test(subject) ? { kind: mode, id: subject } : undefined
  }

  return safeIdRegex.test(subject) ? { kind, id: subject } : undefined
}

export const transistorResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractTransistorEmbed(url)

  if (!embed) {
    return
  }

  const path =
    embed.kind === 'e' || embed.kind === 's'
      ? `${embed.kind}/${embed.id}`
      : `e/${embed.id}/${embed.kind}`

  return {
    provider: 'transistor',
    id: `${subjectNames[embed.kind]}/${embed.id}`,
    src: `https://share.transistor.fm/${path}`,
    height: playerHeights[embed.kind],
  }
}

export const transistorEmbedResolver = createUrlEmbedResolver(
  transistorHosts,
  transistorResolveEmbed,
)
