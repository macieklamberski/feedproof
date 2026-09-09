import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[0-9a-z]+$/i
const safeSlugRegex = /^[0-9a-z][0-9a-z-]*$/i

const transistorHosts = ['transistor.fm']

const playerHeights = { e: 180, latest: 180, playlist: 390 }

const subjectNames = { e: 'episode', latest: 'latest', playlist: 'playlist' }

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
    ...(embed.kind === 'e' && { url: `https://share.transistor.fm/s/${embed.id}` }),
    height: playerHeights[embed.kind],
  }
}

// A Transistor player iframe, or a frame of the share page, which refuses framing.
export const transistorEmbedResolver = createUrlEmbedResolver(
  transistorHosts,
  transistorResolveEmbed,
)
