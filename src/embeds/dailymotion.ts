import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'

const safeVideoIdRegex = /^[a-zA-Z0-9]{5,}$/

const dailymotionHosts = ['dailymotion.com', 'dai.ly']

export const extractDailymotionId = (link: string): string | undefined => {
  const url = parseUrl(link)

  if (!url) {
    return
  }

  const segments = getPathSegments(url)
  const isShortDomain = url.hostname === 'dai.ly' || url.hostname.endsWith('.dai.ly')

  let id: string | undefined

  if (isShortDomain) {
    id = segments[0]
  } else if (segments[0] === 'video') {
    id = segments[1]
  } else if (segments[0] === 'embed' && segments[1] === 'video') {
    id = segments[2]
  } else {
    // geo.dailymotion.com/player.html?video={id}
    id = url.searchParams.get('video') ?? undefined
  }

  // Share URLs append a "_title-slug" to the id; keep only the id.
  id = id?.split('_')[0]

  if (id && safeVideoIdRegex.test(id)) {
    return id
  }
}

export const dailymotionResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractDailymotionId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'dailymotion',
    id: videoId,
    src: `https://www.dailymotion.com/embed/video/${videoId}`,
    url: `https://www.dailymotion.com/video/${videoId}`,
    thumbnail: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
  }
}

export const dailymotionEmbedResolver: EmbedResolver = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    if (!isHostOf(src, dailymotionHosts) && !isSubdomainOf(src, dailymotionHosts)) {
      return
    }

    return dailymotionResolveEmbed(src)
  },
}
