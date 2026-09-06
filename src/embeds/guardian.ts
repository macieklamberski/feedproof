import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const guardianHosts = ['theguardian.com']

// The player is `embed.theguardian.com/embed/video/{path}` and the video's page is the same
// path on `www`: `{section}/video/{yyyy}/{mon}/{dd}/{slug}`. Checked live 2026-09-06: a real
// path answers 200 with the player and its title, a fabricated slug 404.
const playerPathRegex = /^\/embed\/video\/([a-z0-9-]+\/video\/\d{4}\/[a-z]{3}\/\d{2}\/[a-z0-9-]+)$/

// Measured 2026-09-06 in a browser at 300 and 600 pixels wide: the `<video>` is 169 and 338
// tall and is the whole page, so the height is 16:9 of the width with nothing around it. The
// Guardian's snippet states 560 by 315, and publishers who resized it by hand kept the 315
// (400 by 315 in one specimen), so the ratio is preferred over the carrier.
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

export const guardianEmbedResolver = createUrlEmbedResolver(guardianHosts, guardianResolveEmbed, {
  preferResolverSize: true,
})
