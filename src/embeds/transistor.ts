import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Neither length is checked. `/e/` and `/s/` are the only routes read here and Transistor serves
// nothing else behind them: checked 2026-09-07, `transistor.fm/e/` and `transistor.fm/s/` both
// answer 404 on the marketing site, whose own pages sit at the first path segment. What the
// alphabets do is exclude the dot, so neither id can reach a file on the host or climb out of the
// minted path. A show slug is the publisher's own words rather than a generated id, so it
// hyphenates where an episode id never does, and its leading class keeps it from opening with a
// hyphen.
const safeIdRegex = /^[0-9a-z]+$/i
const safeSlugRegex = /^[0-9a-z][0-9a-z-]*$/i

const transistorHosts = ['transistor.fm']

// The episode player is fixed at 180, and Transistor's own oEmbed agrees. The playlist embed
// is taller, so the two kinds are sized apart instead of averaged. A `/latest` player holds
// one episode and matches the episode height. `/playlist` holds the whole show and matches
// the show one.
const playerHeights = { e: 180, latest: 180, playlist: 390 }

// What a placeholder's id names, which has to address the endpoint on its own for enrichment.
const subjectNames = { e: 'episode', latest: 'latest', playlist: 'playlist' }

// A second segment naming a show mode is part of the subject, not decoration. `/e/{slug}/latest`
// is the newest episode of a show and `/e/{slug}/playlist` the whole show, so dropping the
// segment mints `/e/{slug}`, which asks for an episode by a show's name: checked live against
// Transistor's own examples, `/e/megamaker/latest` serves a working player while
// `/e/megamaker` answers 404. Every other trailing segment, `/dark` among them, really is a display option on
// an episode id and is discarded.
const showModes = ['latest', 'playlist'] as const

type Subject = { kind: keyof typeof playerHeights; id: string }

// `/e/{id}` is the episode player and `/s/{id}` the same episode's share page: the per-item
// link a feed carries and the url the per-episode Share menu copies. The two paths take the
// same id, so the share page collapses onto the player it fronts and stays as the page a reader
// opens: `/s/9c22a01c` answers 200 at 215,226 bytes while a fabricated id answers 404 at 13,699
// (probed 2026-09-07). Framing the share page itself renders nothing, because it answers under
// `frame-ancestors 'self'`, and Transistor's own oEmbed for a `/s/` url points its iframe at
// `/e/{id}` at 180.
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

  // A share page is `/s/{id}` and takes nothing after it, so a third segment means the url
  // names something other than the episode. It is the transcript: Transistor writes sidecars
  // at `/s/{id}/{token}.{ext}`, and no legitimate third segment occurs beside them. The
  // episode branch above already vets its own third segment; this is that check on the other
  // path.
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

  const path = embed.kind === 'e' ? `e/${embed.id}` : `e/${embed.id}/${embed.kind}`

  return {
    provider: 'transistor',
    id: `${subjectNames[embed.kind]}/${embed.id}`,
    src: `https://share.transistor.fm/${path}`,
    // A show mode names no page of its own. The embed slug is not the show's website
    // subdomain, so `/e/build-your-saas/playlist` plays while `build-your-saas.transistor.fm`
    // answers 404 and the show sits at `saas.transistor.fm` (probed 2026-09-07).
    // Gated on the kind, not on the value, so this stays a spread and not a trimObject field.
    ...(embed.kind === 'e' && { url: `https://share.transistor.fm/s/${embed.id}` }),
    height: playerHeights[embed.kind],
  }
}

export const transistorEmbedResolver = createUrlEmbedResolver(
  transistorHosts,
  transistorResolveEmbed,
)

// No play request. The player speaks player.js and takes its `play`, flipping to its playing
// state, but loaded in Chrome by a click the audio never started from it. Nothing to send until
// it does.
