import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const cnbcHosts = ['cnbc.com']
const playerHost = 'player.cnbc.com'

// The guid and both path tokens go into the minted src unencoded, so each is checked for the
// characters it may hold. Not for a width: the `byGuid` slot and the three-segment route already
// say which is which, and a band would only refuse the next account CNBC opens.
const safeGuidRegex = /^\d+$/
const safePathTokenRegex = /^[A-Za-z0-9_-]+$/

// The player is `player.cnbc.com/p/{account}/{player}?playertype=synd&byGuid={guid}`, the same
// account and player on every corpus specimen. It answers 200 for any guid, but with the
// player and the clip's title for a real one (14.5 KB) and a "404: This page could not be
// found" page (4 KB) for a fabricated one, checked 2026-09-06 with a browser user agent. The
// Flash-era `plus.cnbc.com/rssvideosearch/…/id/{id}` ids are another space: three of them
// answer that same not-found page on this player, so the Flash carrier is not claimed.
//
// The JW instance runs in aspect mode with a 56.25% spacer and fills the frame it is given, with
// its title band absolutely positioned inside rather than stacked below. So the frame's honest
// shape is the clip's, and the 560 by 349 CNBC's own snippet states, which 59% of the carriers
// copy, reserves 34 pixels of blank at that width. Measured 2026-09-07.
const playerRatio = '16/9'

export const cnbcResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, cnbcHosts)
  const [route, account, player, extra] = parsed ? getPathSegments(parsed) : []
  const guid = parsed?.searchParams.get('byGuid')

  if (parsed?.hostname !== playerHost || route !== 'p' || !account || !player || extra) {
    return
  }

  if (!safePathTokenRegex.test(account) || !safePathTokenRegex.test(player)) {
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
