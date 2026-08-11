import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const captivateHosts = ['captivate.fm']

// 200 across every sampled corpus specimen, and Captivate publishes no oEmbed, so the height
// is the whole of what this states beyond the provider tag.
const playerHeight = 200

const embedKinds = ['episode', 'show']

export const extractCaptivateEmbed = (link: string): { kind: string; id: string } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const [kind, id] = segments

  if (!kind || !id || !embedKinds.includes(kind) || !uuidRegex.test(id)) {
    return
  }

  return { kind, id }
}

export const captivateResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractCaptivateEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider: 'captivate',
    id: `${embed.kind}/${embed.id}`,
    src: `https://player.captivate.fm/${embed.kind}/${embed.id}`,
    height: playerHeight,
  }
}

export const captivateEmbedResolver = createIframeEmbedResolver(
  captivateHosts,
  captivateResolveEmbed,
)
