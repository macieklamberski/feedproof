import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Every Youku video id opens with a literal X.
const safeVideoIdRegex = /^X[A-Za-z0-9=]+$/

const youkuHosts = ['player.youku.com', 'static.youku.com']

const embedPathRegex = /^\/embed\/([^/]+)\/?$/
const flashPathRegex = /^\/player\.php\/sid\/([^/]+)\/v\.swf$/
const staticFlashPathRegex = /^\/v[\d.]+\/v\/swf\/\w*player\.swf$/

const playerRatio = '16/9'

const readVideoId = (url: string): string | undefined => {
  const parsed = parseUrlOnHosts(url, youkuHosts)

  if (parsed?.hostname === 'static.youku.com') {
    return staticFlashPathRegex.test(parsed.pathname)
      ? keepIfMatches(parsed.searchParams.get('VideoIDS'), safeVideoIdRegex)
      : undefined
  }

  const videoId =
    parsed?.pathname.match(embedPathRegex)?.[1] ?? parsed?.pathname.match(flashPathRegex)?.[1]

  return keepIfMatches(videoId, safeVideoIdRegex)
}

export const youkuResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = readVideoId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'youku',
    id: videoId,
    src: `https://player.youku.com/embed/${videoId}`,
    url: `https://v.youku.com/v_show/id_${videoId}.html`,
    ratio: playerRatio,
  }
}

// A Youku player iframe, or a Flash player embed whose swf now redirects to the homepage.
export const youkuEmbedResolver = createUrlEmbedResolver(youkuHosts, youkuResolveEmbed, {
  preferResolverSize: true,
})
