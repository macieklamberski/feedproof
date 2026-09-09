import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { decodeSegment } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `{show}+{episode}`, both halves base64url.
const safeTokenRegex = /^[A-Za-z0-9_-]+\+[A-Za-z0-9_-]+$/

const playerVersionRegex = /^v\d$/

const currentPlayerVersion = 'v3'

const firesideHosts = ['fireside.fm']

const playerHeight = 200

type FiresidePlayer = { version: string; token: string }

export const extractFiresideToken = (link: string): FiresidePlayer | undefined => {
  const segments = getPathSegments(link)
  const versioned = segments[0] === 'player' ? segments.slice(1) : segments
  const [version, encodedToken] =
    segments[0] === 's' ? [currentPlayerVersion, segments[1]] : versioned

  if (!version || !playerVersionRegex.test(version)) {
    return
  }

  const token = decodeSegment(encodedToken)

  if (token && safeTokenRegex.test(token)) {
    return { version, token }
  }
}

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

// Fireside's episode player iframe, versioned or on the retired /s/ share route that is gone.
export const firesideEmbedResolver = createUrlEmbedResolver(firesideHosts, firesideResolveEmbed)
