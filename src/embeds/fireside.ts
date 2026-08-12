import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

// The token pairs a show with an episode across a `+`, e.g. `DiNRb69N+Dagp3z15`.
const safeTokenRegex = /^[A-Za-z0-9]+\+[A-Za-z0-9]+$/

const firesideHosts = ['fireside.fm']

// Fireside's player is one fixed size: `height="200"` in **28 of 28** sampled corpus iframes.
// That is the whole case for this resolver — the embed carries no metadata, no thumbnail and
// no canonical episode url, so stating the height is what a reader gains, the same way
// speakerdeckScriptEmbedResolver states its default deck ratio.
const playerHeight = 200

// Feeds write `fireside.fm/player/v2/{token}`, which 301s to `player.fireside.fm/v2/{token}`
// (checked 2026-08-11, the target answers 200). Minting the target spares the reader a hop.

export const extractFiresideToken = (link: string): string | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)

  if (segments[0] !== 'player' || segments[1] !== 'v2') {
    return
  }

  const token = segments[2] ? decodeURIComponent(segments[2]) : undefined

  if (token && safeTokenRegex.test(token)) {
    return token
  }
}

export const firesideResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const token = extractFiresideToken(url)

  if (!token) {
    return
  }

  return {
    provider: 'fireside',
    id: token,
    src: `https://player.fireside.fm/v2/${token}`,
    height: playerHeight,
  }
}

export const firesideEmbedResolver = createIframeEmbedResolver(firesideHosts, firesideResolveEmbed)
