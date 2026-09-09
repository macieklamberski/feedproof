import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Every Youku video id opens with a literal X, and without it a route word in the id position,
// embed/about, reads as a video.
// The rest is the base64 spelling of a number, padding kept: `XODczMzU0NTAw`, `XNDUyNTczMDEyOA==`.
const safeVideoIdRegex = /^X[A-Za-z0-9=]+$/

const youkuHosts = ['player.youku.com', 'static.youku.com']

// The modern player, `/embed/{vid}`, and the two Flash forms that carried the same id:
// `/player.php/sid/{vid}/v.swf` on the player host and `/v{version}/v/swf/{q}player.swf` on the
// static host with the id in a `VideoIDS` query.
const embedPathRegex = /^\/embed\/([^/]+)\/?$/
const flashPathRegex = /^\/player\.php\/sid\/([^/]+)\/v\.swf$/
const staticFlashPathRegex = /^\/v[\d.]+\/v\/swf\/\w*player\.swf$/

// The 510x498 and 480x400 boxes the carriers state held the retired player's chrome.
// The modern player is chromeless and fills its box, and Youku's own watch page sizes it 16:9.
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

  // The poster lives under a hash the id does not yield, and the player host serves the same
  // shell for any id.
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
