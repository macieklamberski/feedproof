import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { uuidRegex } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'captivate'

const captivateHosts = ['captivate.fm']

const playerHeight = 200

const embedKindRegex = /^[a-z]+$/

export const extractCaptivateEmbed = (link: string): { kind: string; id: string } | undefined => {
  const segments = getPathSegments(link)
  const [kind, id] = segments

  if (segments.length !== 2 || !kind || !id || !embedKindRegex.test(kind) || !uuidRegex.test(id)) {
    return
  }

  return { kind, id }
}

// Captivate's player iframe, a kind and a uuid, with no oEmbed to size it.
export const captivateResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractCaptivateEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider,
    id: `${embed.kind}/${embed.id}`,
    src: `https://player.captivate.fm/${embed.kind}/${embed.id}`,
    height: playerHeight,
  }
}

export const captivateEmbedResolver = createUrlEmbedResolver(captivateHosts, captivateResolveEmbed)

export const captivateRenderHint: EmbedRenderHint = {
  provider,
  requestPlay: { action: 'CP.API.PLAY' },
}
