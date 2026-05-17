import { isHostOf, isSubdomainOf } from 'feedscout/utils'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'

const safeVideoIdRegex = /^[a-zA-Z0-9_-]{11}$/

const pathIdSegments = ['shorts', 'embed', 'live', 'v']

const youtubeHosts = ['youtube.com', 'youtube-nocookie.com', 'youtu.be']

export const composeThumbnailUrl = (videoId: string): string => {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export const extractVideoId = (link: string): string | undefined => {
  try {
    const { hostname, pathname, searchParams } = new URL(link)
    const segments = pathname.split('/').filter(Boolean)
    const isShortDomain = hostname === 'youtu.be' || hostname.endsWith('.youtu.be')

    let id: string | null | undefined

    if (isShortDomain) {
      id = segments[0]
    } else if (segments[0] === 'watch') {
      id = searchParams.get('v') ?? searchParams.get('vi')
    } else if (segments.length >= 2 && pathIdSegments.includes(segments[0])) {
      id = segments[1]
    }

    if (id && safeVideoIdRegex.test(id)) {
      return id
    }
  } catch {}
}

export const youtubeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractVideoId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'youtube',
    id: videoId,
    src: `https://www.youtube-nocookie.com/embed/${videoId}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: composeThumbnailUrl(videoId),
  }
}

export const youtubeEmbedResolver: EmbedResolver = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    if (!isHostOf(src, youtubeHosts) && !isSubdomainOf(src, youtubeHosts)) {
      return
    }

    return youtubeResolveEmbed(src)
  },
}
