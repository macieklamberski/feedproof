import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const nytimesHosts = ['nytimes.com']

const safeIdRegex = /^\d+$/

const playerPath = '/video/players/offsite/index.html'
const legacyPlayerPath = '/bcvideo/1.0/iframe/embed.html'

const playerRatio = '16/9'

export const nytimesResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, nytimesHosts)
  const id = parsed?.searchParams.get('videoId')

  if (parsed?.pathname !== playerPath && parsed?.pathname !== legacyPlayerPath) {
    return
  }

  if (!id || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'nytimes',
    id,
    src: `https://www.nytimes.com${playerPath}?videoId=${id}`,
    ratio: playerRatio,
  }
}

// The Brightcove-era nytimes.com/bcvideo iframe player, which answers 400 for every id today.
export const nytimesIframeEmbedResolver = createUrlEmbedResolver(nytimesHosts, nytimesResolveEmbed)
