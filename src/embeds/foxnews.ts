import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'foxnews'

const safeIdRegex = /^\d+$/

const foxnewsHosts = ['video.foxnews.com']

const playerRatio = '16/9'

const composeEmbed = (id: string): EmbedResolverResult => {
  return {
    provider,
    id,
    src: `https://video.foxnews.com/v/video-embed.html?video_id=${id}`,
    url: `https://www.foxnews.com/video/${id}`,
    ratio: playerRatio,
  }
}

export const foxnewsResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, foxnewsHosts)
  const id = parsed?.searchParams.get('video_id') ?? parsed?.searchParams.get('id')
  const [route, page] = parsed ? getPathSegments(parsed) : []

  if (route !== 'v' || (page !== 'embed.js' && page !== 'video-embed.html')) {
    return
  }

  return id && safeIdRegex.test(id) ? composeEmbed(id) : undefined
}

// Fox's old share snippet is an `embed.js` script tag whose loader is gone, so nothing plays.
export const foxnewsScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="video.foxnews.com/v/embed.js"]',
  (element) => {
    return foxnewsResolveEmbed(attr(element, 'src') ?? '')
  },
)

export const foxnewsIframeEmbedResolver = createUrlEmbedResolver(foxnewsHosts, foxnewsResolveEmbed)

export const foxnewsRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true' },
}
