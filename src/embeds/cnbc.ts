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
// No width: a band would refuse the next account CNBC opens.
const safePathTokenRegex = /^[A-Za-z0-9_-]+$/

// The JW player runs in aspect mode with a 56.25% spacer and its title band inside the picture.
// CNBC's own snippet states 560 by 349, which leaves 34 pixels blank at that width.
const playerRatio = '16/9'

// CNBC's player.cnbc.com clip iframe, pasted in a box taller than the 16:9 clip it fills.
// It answers 200 for any guid, with a not-found page in the body for a fabricated one. The
// Flash-era `plus.cnbc.com/rssvideosearch/…/id/{id}` ids are another space and get that page.
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
