import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A Tencent Video id is eleven lowercase letters and digits, `g3364rmlrwd`.
const safeVideoIdRegex = /^[a-z0-9]{11}$/

// `v.qq.com` serves the player; the other two served the Flash player.
const tencentHosts = ['v.qq.com', 'static.video.qq.com', 'imgcache.qq.com']

// The current player is `/txp/iframe/player.html?vid=`. The older `/iframe/player.html` is a
// stub that `location.replace`s onto it, `/iframe/preview.html` is the mobile player of the
// same era, and the Flash player was `TPout.swf?vid=` on a static host. Every one of them names
// the video in `vid`, so every one of them mints the current player.
const playerPathRegex = /^\/(?:txp\/iframe\/player|iframe\/player|iframe\/preview)\.html$/
const flashPathRegex = /\/TPout\.swf$/i

// `puui.qpic.cn/qqvideo_ori/0/{vid}_496_280/0` is the poster the watch page shows, addressed by
// the id alone: 8 of 9 corpus ids answer a jpeg and an invented id answers a 5 KB png
// placeholder (checked 2026-09-06). `vv.video.qq.com/getinfo?vids={vid}&otype=json` answers
// key-free with the title, the duration and the frame size, and an error code for an invented
// id, so the id is a self-sufficient enrichment key.
//
// The player is chromeless and fills its box, and Tencent's own snippet states no size at all.
// The 640x498 and 500x375 boxes the older carriers state held the retired player's chrome, so
// the ratio stands over what a carrier declares.
const playerRatio = '16/9'

const readVideoId = (url: string): string | undefined => {
  const parsed = parseUrlOnHosts(url, tencentHosts)
  const pathRegex = parsed?.hostname === 'v.qq.com' ? playerPathRegex : flashPathRegex

  return parsed && pathRegex.test(parsed.pathname)
    ? keepIfMatches(parsed.searchParams.get('vid'), safeVideoIdRegex)
    : undefined
}

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
    thumbnail: `https://puui.qpic.cn/qqvideo_ori/0/${videoId}_496_280/0`,
    ratio: playerRatio,
  }
}

export const tencentEmbedResolver = createUrlEmbedResolver(tencentHosts, tencentResolveEmbed, {
  preferResolverSize: true,
})
