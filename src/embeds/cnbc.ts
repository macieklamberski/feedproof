import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const cnbcHosts = ['cnbc.com']
const playerHost = 'player.cnbc.com'

const safeGuidRegex = /^\d{6,}$/

// The player is `player.cnbc.com/p/{account}/{player}?playertype=synd&byGuid={guid}`, one
// account and one player on every corpus specimen. It answers 200 for any guid, but with the
// player and the clip's title for a real one (14.5 KB) and a "404: This page could not be
// found" page (4 KB) for a fabricated one, checked 2026-09-06 with a browser user agent. The
// Flash-era `plus.cnbc.com/rssvideosearch/…/id/{id}` ids are another space: three of them
// answer that same not-found page on this player, so the Flash carrier is not claimed.
//
// In a browser the player is a JW Player instance sized 16:9 of the viewport width (1000 by
// 563), which the snippet's 560 by 349 agrees with; a publisher who states 100% by 580 does
// not, so the ratio is preferred. Not measured at a second viewport width.
const playerRatio = '16/9'

export const cnbcResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, cnbcHosts)
  const [route, account, player, extra] = parsed ? getPathSegments(parsed) : []
  const guid = parsed?.searchParams.get('byGuid')

  if (parsed?.hostname !== playerHost || route !== 'p' || !account || !player || extra) {
    return
  }

  if (!guid || !safeGuidRegex.test(guid)) {
    return
  }

  return {
    provider: 'cnbc',
    id: guid,
    src: `https://player.cnbc.com/p/${account}/${player}?playertype=synd&byGuid=${guid}`,
    ratio: playerRatio,
  }
}

export const cnbcIframeEmbedResolver = createUrlEmbedResolver(cnbcHosts, cnbcResolveEmbed, {
  preferResolverSize: true,
})
