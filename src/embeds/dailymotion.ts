import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^[a-zA-Z0-9]{5,}$/

const dailymotionHosts = ['dailymotion.com', 'dai.ly']

// Segments that name a route rather than a video. `/swf/video/{id}` stacks two of them, which is
// the second of the two forms the Flash player shipped.
const pathWords = new Set(['embed', 'video', 'swf'])

const readPathId = (url: URL, segments: Array<string>): string | undefined => {
  if (url.hostname === 'dai.ly' || url.hostname.endsWith('.dai.ly')) {
    return segments[0]
  }

  let index = 0

  while (index < segments.length && pathWords.has(segments[index])) {
    index++
  }

  // A path opening with no route word names no video. Site pages would otherwise read as one:
  // `/about` is five legal id characters.
  return index > 0 ? segments[index] : undefined
}

export const extractDailymotionId = (link: string): string | undefined => {
  const url = parseUrl(link)

  if (!url) {
    return
  }

  // Each candidate is validated on its own, so a path segment that is not an id still leaves
  // the geo player's `video` parameter to be read.
  return (
    [readPathId(url, getPathSegments(url)), url.searchParams.get('video')]
      // Share urls append a "_title-slug" to the id. Keep only the id.
      .map((candidate) => keepIfMatches(candidate?.split('_')[0], safeVideoIdRegex))
      .find(Boolean)
  )
}

// Where playback starts, and the playlist the video sits in. The rest of the publisher's
// query is dropped with the rebuilt src.
const dailymotionEmbedParams = ['start', 'playlist']

export const dailymotionResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractDailymotionId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'dailymotion',
    id: videoId,
    src: `https://www.dailymotion.com/embed/video/${videoId}${pickUrlParams(url, dailymotionEmbedParams)}`,
    url: `https://www.dailymotion.com/video/${videoId}`,
    thumbnail: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
  }
}

export const dailymotionEmbedResolver = createUrlEmbedResolver(
  dailymotionHosts,
  dailymotionResolveEmbed,
)
