import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const guardianHosts = ['theguardian.com']

// `/embed/video/{section}/video/{yyyy}/{mon}/{dd}/{slug}`.
const playerPathRegex = /^\/embed\/video\/([a-z0-9-]+\/video\/\d{4}\/[a-z]{3}\/\d{2}\/[a-z0-9-]+)$/

const playerRatio = '16/9'

export const guardianResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, guardianHosts)
  const path = parsed?.pathname.match(playerPathRegex)?.[1]

  if (parsed?.hostname !== 'embed.theguardian.com' || !path) {
    return
  }

  return {
    provider: 'guardian',
    id: path,
    src: `https://embed.theguardian.com/embed/video/${path}`,
    url: `https://www.theguardian.com/${path}`,
    ratio: playerRatio,
  }
}

export const guardianEmbedResolver = createUrlEmbedResolver(guardianHosts, guardianResolveEmbed)
