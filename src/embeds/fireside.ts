import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The token pairs a show with an episode across a `+`, e.g. `DiNRb69N+Dagp3z15`. Both halves are
// base64url, so `-` and `_` occur: of five tokens read off live shows, three carried one
// (`I-2by1pi+kf-gXAOz`, `nj9oaFbU+BY9LAva_`, `gs5CXE6m+HQzPSv-Z`, 2026-08-15).
const safeTokenRegex = /^[A-Za-z0-9_-]+\+[A-Za-z0-9_-]+$/

// The version sits before the token on both hosts: `fireside.fm/player/{version}/{token}` and
// `player.fireside.fm/{version}/{token}`. v3 is what the platform writes today and v2 still
// serves, so the publisher's choice is carried through instead of normalised to one of them.
const playerVersions = new Set(['v2', 'v3'])

const firesideHosts = ['fireside.fm']

const decodeSegment = (segment: string | undefined): string | undefined => {
  if (!segment) {
    return
  }

  try {
    return decodeURIComponent(segment)
  } catch {}
}

// Fireside's player is one fixed size: `height="200"` in 28 of 28 sampled corpus iframes.
// That is the whole case for this resolver: the embed carries no metadata, no thumbnail and
// no canonical episode url, so stating the height is what a reader gains, the same way
// speakerdeckScriptEmbedResolver states its default deck ratio.
const playerHeight = 200

type FiresidePlayer = { version: string; token: string }

export const extractFiresideToken = (link: string): FiresidePlayer | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const versioned = segments[0] === 'player' ? segments.slice(1) : segments
  const [version, encodedToken] = versioned

  if (!version || !playerVersions.has(version)) {
    return
  }

  // The `+` joining the two halves arrives as `%2B` from some feeds, so the segment is decoded
  // before it is tested. A malformed escape throws, and an unreadable token is no token.
  const token = decodeSegment(encodedToken)

  if (token && safeTokenRegex.test(token)) {
    return { version, token }
  }
}

// Feeds write `fireside.fm/player/{version}/{token}`, which 301s to the same path on
// `player.fireside.fm` (checked 2026-08-11 and again 2026-08-15). Minting the target spares the
// reader a hop, and that target discriminates: a real token answers 200 while a fabricated one
// answers 404, unlike the player shells most podcast hosts serve.
export const firesideResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const player = extractFiresideToken(url)

  if (!player) {
    return
  }

  return {
    provider: 'fireside',
    id: player.token,
    src: `https://player.fireside.fm/${player.version}/${player.token}`,
    height: playerHeight,
  }
}

export const firesideEmbedResolver = createUrlEmbedResolver(firesideHosts, firesideResolveEmbed)
