import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^[a-z0-9]+$/

const nonVideoWords = new Set(['cover'])

const tencentHosts = ['v.qq.com', 'static.video.qq.com', 'imgcache.qq.com']

const playerPathRegex = /^\/(?:txp\/iframe\/player|iframe\/player|iframe\/preview)\.html$/
const flashPathRegex = /\/TPout\.swf$/i

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
    thumbnail: `https://puui.qpic.cn/qqvideo_ori/0/${videoId}_496_280/0`,
    ratio: playerRatio,
  }
}

export const tencentEmbedResolver = createUrlEmbedResolver(tencentHosts, tencentResolveEmbed, {
  preferResolverSize: true,
})
