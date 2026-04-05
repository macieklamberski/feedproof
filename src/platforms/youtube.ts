import type { EmbedResolverResult } from '../types.js'

const safeVideoIdRegex = /^[a-zA-Z0-9_-]+$/

export const youtubeEmbedDomains = ['youtube-nocookie.com', 'youtube.com', 'www.youtube.com']

export const composeThumbnailUrl = (videoId: string): string => {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
}

export const extractVideoId = (link: string): string | undefined => {
  try {
    const { pathname, searchParams } = new URL(link)
    const id = searchParams.get('v') ?? pathname.split('/').filter(Boolean).pop()

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
    src: `https://www.youtube-nocookie.com/embed/${videoId}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: composeThumbnailUrl(videoId),
    type: 'iframe',
  }
}
