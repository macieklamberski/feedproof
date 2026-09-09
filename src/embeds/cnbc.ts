import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const cnbcHosts = ['cnbc.com']
const playerHost = 'player.cnbc.com'

const safeGuidRegex = /^\d+$/
const safePathTokenRegex = /^[A-Za-z0-9_-]+$/

const playerRatio = '16/9'

// CNBC's player.cnbc.com clip iframe, pasted in a box taller than the 16:9 clip it fills.
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
