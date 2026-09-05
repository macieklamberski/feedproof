import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { pickUrlParams, splitStrayParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^[a-zA-Z0-9]{5,}$/

// Named one by one rather than by a `dailymotion.{tld}` pattern, which would trust any
// registration under the name: `.de` is third-party and left out. Each apex redirects to a
// language landing page, dropping the video, so reading the id repairs what the url loses.
const dailymotionHosts = [
  'dailymotion.com',
  'dailymotion.co.uk',
  'dailymotion.es',
  'dailymotion.fr',
  'dailymotion.it',
  'dai.ly',
]

// Segments that name a route rather than a video. `/swf/video/{id}` stacks two of them, which is
// the second of the two forms the Flash player shipped.
const pathWords = new Set(['embed', 'video', 'swf'])

// Words that introduce something other than a single video, so the segment is a route and never
// an id. `/embed/playlist/{id}` would otherwise yield the literal `playlist`, which is eight
// legal characters and passes the id test on length alone.
const collectionWords = new Set(['playlist'])

// A playlist names no single video, so it is read separately and only once the video readers have
// found nothing: `/embed/video/{id}?playlist={id}` is a video playing inside one, not a playlist.
export const extractDailymotionPlaylistId = (link: string): string | undefined => {
  const url = parseUrl(link)

  if (!url) {
    return
  }

  const segments = getPathSegments(url)
  const marker = segments.indexOf('playlist')
  const candidate = marker < 0 ? url.searchParams.get('playlist') : segments[marker + 1]

  return keepIfMatches(candidate, safeVideoIdRegex)
}

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
  const candidate = index > 0 ? segments[index] : undefined

  return candidate && !collectionWords.has(candidate) ? candidate : undefined
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
      // The Flash player wrote `/swf/{id}&colors=…`, so the id is the segment's head.
      .map((candidate) =>
        keepIfMatches(
          candidate && splitStrayParams(candidate).head.split('_')[0],
          safeVideoIdRegex,
        ),
      )
      .find(Boolean)
  )
}

// Where playback starts, and the playlist the video sits in. The rest of the publisher's
// query is dropped with the rebuilt src.
const dailymotionEmbedParams = ['start', 'playlist']

export const dailymotionResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractDailymotionId(url)

  if (videoId) {
    return {
      provider: 'dailymotion',
      id: videoId,
      src: `https://www.dailymotion.com/embed/video/${videoId}${pickUrlParams(url, dailymotionEmbedParams)}`,
      url: `https://www.dailymotion.com/video/${videoId}`,
      thumbnail: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
      ratio: '16/9',
    }
  }

  const playlistId = extractDailymotionPlaylistId(url)

  if (playlistId) {
    // The id is qualified because a playlist and a video share one id grammar, and what reaches
    // an enrichment pass is the provider and the id alone. No thumbnail comes with it:
    // `/thumbnail/playlist/{id}` answers 404, and the video endpoint answers about a video.
    return {
      provider: 'dailymotion',
      id: `playlist/${playlistId}`,
      src: `https://www.dailymotion.com/embed/playlist/${playlistId}`,
      url: `https://www.dailymotion.com/playlist/${playlistId}`,
    }
  }
}

export const dailymotionEmbedResolver = createUrlEmbedResolver(
  dailymotionHosts,
  dailymotionResolveEmbed,
)

// No autoplay hint. The runtime-parameter docs list `autoplay`, but neither player url reads it
// off the query: the legacy `/embed/video/` url redirects to the new player and the redirect
// drops it, and the new player takes autostart from the saved player configuration alone.
