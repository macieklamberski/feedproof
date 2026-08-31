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

// The Flash player took its parameters with `&` and no `?`, so `/swf/{id}&colors=background:000000`
// arrives as one path segment and the id fails the length check. Browsers read the leading id out
// of it, and so does this.
const strayParamsRegex = /&.*$/

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
      .map((candidate) =>
        keepIfMatches(candidate?.replace(strayParamsRegex, '').split('_')[0], safeVideoIdRegex),
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
    // The player scales with its column rather than sitting in a fixed box, so the shape is what
    // there is to state. Dailymotion's own oEmbed answers 480x269 for a video, and a carrier that
    // declares its own size still outranks this.
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
