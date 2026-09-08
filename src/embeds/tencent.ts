import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A Tencent Video id is a run of lowercase letters and digits, eleven characters in the wild.
// The length is not checked: a bound would only refuse the next length Tencent mints. The
// enclosure probe offers every attachment a feed carries to this resolver, and a media file on the
// host is refused by the anchored player path below, since `vid` only ever arrives in a query. The
// alphabet excludes the dot, which refuses the one shape that gets past the path: a player url
// whose `vid` is a file name.
const safeVideoIdRegex = /^[a-z0-9]+$/

// Tencent's own route word, from `v.qq.com/x/cover/{cid}/{vid}.html`, left in `vid` by an embed
// snippet nobody filled in. It is the one non-id among 65 `vid` values mined from the corpus; the
// other, `$1`, the alphabet already refuses. The player answers the same 1,127-byte shell for it
// as for a real id, but the poster route hands back its 5 KB png placeholder and
// `x/page/cover.html` serves the not-found body, so a grey thumbnail and a dead link are minted
// where the generic frame drew a click-to-load box.
const nonVideoWords = new Set(['cover'])

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

  if (!parsed || !pathRegex.test(parsed.pathname)) {
    return
  }

  const videoId = keepIfMatches(parsed.searchParams.get('vid'), safeVideoIdRegex)

  return videoId && !nonVideoWords.has(videoId) ? videoId : undefined
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
