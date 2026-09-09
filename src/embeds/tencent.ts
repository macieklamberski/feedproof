import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A Tencent Video id is a run of lowercase letters and digits, eleven characters in the wild.
const safeVideoIdRegex = /^[a-z0-9]+$/

// A vid of cover is an unfilled snippet's route word, and it mints a grey poster and a dead link.
// The word is Tencent's own, from `v.qq.com/x/cover/{cid}/{vid}.html`.
const nonVideoWords = new Set(['cover'])

// `v.qq.com` serves the player; the other two served the Flash player.
const tencentHosts = ['v.qq.com', 'static.video.qq.com', 'imgcache.qq.com']

// `/txp/iframe/player.html` is the current player. The older `/iframe/player.html` is a stub that
// `location.replace`s onto it, and `/iframe/preview.html` is the mobile player of the same era.
const playerPathRegex = /^\/(?:txp\/iframe\/player|iframe\/player|iframe\/preview)\.html$/
const flashPathRegex = /\/TPout\.swf$/i

// The 640x498 and 500x375 boxes the older carriers state held the retired player's chrome.
// The player is chromeless and fills its box, and Tencent's own snippet states no size at all.
const playerRatio = '16/9'

const readVideoId = (url: string): string | undefined => {
  const parsed = parseUrlOnHosts(url, tencentHosts)
  const pathRegex = parsed?.hostname === 'v.qq.com' ? playerPathRegex : flashPathRegex

  if (!parsed || !pathRegex.test(parsed.pathname)) {
    return
  }

  const videoId = keepIfMatches(parsed.searchParams.get('vid'), safeVideoIdRegex)

  return videoId && !nonVideoWords.has(videoId) ? videoId : undefined
}

// Tencent Video's player iframe and the dead Flash TPout.swf carrier, both naming the video in vid.
export const tencentResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = readVideoId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'tencent',
    id: videoId,
    src: `https://v.qq.com/txp/iframe/player.html?vid=${videoId}`,
    url: `https://v.qq.com/x/page/${videoId}.html`,
    // The poster the watch page shows, addressed by the id alone, and an invented id gets a 5 KB
    // png placeholder. `vv.video.qq.com/getinfo?vids={vid}&otype=json` answers key-free with the
    // title, the duration and the frame size.
    thumbnail: `https://puui.qpic.cn/qqvideo_ori/0/${videoId}_496_280/0`,
    ratio: playerRatio,
  }
}

export const tencentEmbedResolver = createUrlEmbedResolver(tencentHosts, tencentResolveEmbed, {
  preferResolverSize: true,
})
