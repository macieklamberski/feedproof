import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A Youku video id is an `X` followed by the base64 spelling of a number, with the padding kept:
// `XODczMzU0NTAw`, `XNDUyNTczMDEyOA==`.
const safeVideoIdRegex = /^X[A-Za-z0-9]{8,24}={0,2}$/

const youkuHosts = ['player.youku.com', 'static.youku.com']

// The modern player, `/embed/{vid}`, and the two Flash forms that carried the same id:
// `/player.php/sid/{vid}/v.swf` on the player host and `/v{version}/v/swf/{q}player.swf` on the
// static host with the id in a `VideoIDS` query.
const embedPathRegex = /^\/embed\/([^/]+)\/?$/
const flashPathRegex = /^\/player\.php\/sid\/([^/]+)\/v\.swf$/
const staticFlashPathRegex = /^\/v[\d.]+\/v\/swf\/\w*player\.swf$/

// The Flash player is dead twice over: no browser runs it, and `player.php/sid/{vid}/v.swf` now
// 302s to a `youkuoffline.swf` on the video host that redirects on to the homepage. The id it
// names is the one the modern player takes, so the repair is a path rewrite. Checked 2026-09-06
// through the open API the player page itself calls: 6 of 10 Flash-era ids still answer with a
// title and a poster, a fabricated id answers "video not exist". The player host is a shell that
// serves the same 5,164 bytes for any id, so the API is the only check that carries information.
// The poster lives under a hash the id does not yield, so it is left to enrichment.
//
// The modern player is chromeless and fills its box; Youku's own watch page sizes it 16:9
// (622x350). The 510x498 its old share snippet wrote, and the 480x400 the Flash embeds carry, are
// boxes with the retired chrome in them, so the ratio stands over what a carrier declares.
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

export const youkuEmbedResolver = createUrlEmbedResolver(youkuHosts, youkuResolveEmbed, {
  preferResolverSize: true,
})
