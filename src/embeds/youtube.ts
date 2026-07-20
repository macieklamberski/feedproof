import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { pickUrlParams } from '../utils/urls.js'

const safeVideoIdRegex = /^[a-zA-Z0-9_-]{11}$/

const pathIdSegments = ['shorts', 'embed', 'live', 'v']

const youtubeHosts = ['youtube.com', 'youtube-nocookie.com', 'youtu.be']

// hqdefault always exists for a video, so it's the safe default. Higher-res variants
// (maxresdefault, sddefault) give a sharper poster but only exist for some videos, so
// we can't pick them blindly.
// TODO: detect and prefer a higher-res thumbnail when present — the best available
// resolution varies per video, so it needs a probe (HEAD request) rather than a guess.
export const composeThumbnailUrl = (videoId: string): string => {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export const extractVideoId = (link: string): string | undefined => {
  const url = parseUrl(link)

  if (!url) {
    return
  }

  const segments = getPathSegments(url)
  const isShortDomain = url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')

  let id: string | null | undefined

  if (isShortDomain) {
    id = segments[0]
  } else if (segments[0] === 'watch') {
    id = url.searchParams.get('v') ?? url.searchParams.get('vi')
  } else if (segments.length >= 2 && pathIdSegments.includes(segments[0])) {
    id = segments[1]
  }

  if (id && safeVideoIdRegex.test(id)) {
    return id
  }
}

// Parameters that change what the player shows, so a rebuilt src has to carry them: where
// playback starts and ends, which playlist the video sits in and at which position, and the
// window of a clip (`clip` is the clip id, `clipt` its encoded bounds — a clip embed needs
// both). Everything else the publisher wrote — autoplay, `rel`, `si` and other tracking — is
// dropped with the rest of the original query.
const youtubeEmbedParams = ['start', 'end', 'list', 'index', 'clip', 'clipt']

export const youtubeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractVideoId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'youtube',
    id: videoId,
    src: `https://www.youtube.com/embed/${videoId}${pickUrlParams(url, youtubeEmbedParams)}`,
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
