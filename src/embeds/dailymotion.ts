import { getPathSegments, type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import {
  parseUrlOnHosts,
  pickUrlParams,
  placeholderBaseUrl,
  splitStrayParams,
} from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// No length floor: the oldest ids are four characters, and `x13i` still plays.
const safeVideoIdRegex = /^[a-zA-Z0-9]+$/

// Listed one by one: `dailymotion.de` is third-party, and a tld pattern would trust it.
// Each apex redirects to a language landing page, dropping the video.
const dailymotionHosts = [
  'dailymotion.com',
  'dailymotion.co.uk',
  'dailymotion.es',
  'dailymotion.fr',
  'dailymotion.it',
  'dai.ly',
]

// The Flash player shipped `/swf/{id}` and `/swf/video/{id}`, which stacks two route words.
const pathWords = new Set(['embed', 'video', 'swf'])

// `/embed/{locale}/video/{id}` serves the player and redirects to
// `geo.dailymotion.com/player.html?video={id}`.
const localeRegex = /^[a-z]{2}$/

// Kinds Dailymotion's embed route serves besides a video: each reaches the player with an empty
// `video=` or redirects to a page, so the segment names a listing or a landing page.
const nonVideoWords = new Set([
  'playlist',
  'user',
  'channel',
  'group',
  'tag',
  'search',
  'topic',
  'collection',
  'feed',
  'videos',
  'live',
])

const isRouteWord = (segment: string): boolean => {
  return pathWords.has(segment) || nonVideoWords.has(segment)
}

const skipRouteWords = (segments: Array<string>): number => {
  let index = 0

  while (
    index < segments.length &&
    (pathWords.has(segments[index]) ||
      (localeRegex.test(segments[index]) && isRouteWord(segments[index + 1])))
  ) {
    index++
  }

  return index
}

// Share urls append a `_title-slug` to the id and the platform strips it itself. The Flash player
// wrote `/swf/{id}&colors=…`, so a stray query rides on the segment too.
const readId = (candidate: Nullish<string>): string | undefined => {
  const head = candidate && splitStrayParams(candidate).head.split('_')[0]

  return keepIfMatches(head, safeVideoIdRegex)
}

// A playlist names no single video, so it is read separately and only once the video readers have
// found nothing: `/embed/video/{id}?playlist={id}` is a video playing inside one, not a playlist.
export const extractDailymotionPlaylistId = (link: string): string | undefined => {
  const url = parseUrl(link, placeholderBaseUrl)

  if (!url) {
    return
  }

  const segments = getPathSegments(url)
  const marker = skipRouteWords(segments)

  const candidate =
    segments[marker] === 'playlist' ? segments[marker + 1] : url.searchParams.get('playlist')

  return readId(candidate)
}

const readPathId = (url: URL, segments: Array<string>): string | undefined => {
  // The short domain is a pure shortener with no routes of its own: every path it does not know
  // as a video goes to `/urlshortener?path=…`, so nothing there needs telling from an id.
  if (url.hostname === 'dai.ly' || url.hostname.endsWith('.dai.ly')) {
    return segments[0]
  }

  const index = skipRouteWords(segments)

  // A path opening with no route word names no video. Site pages would otherwise read as one:
  // `/about` is five legal id characters.
  const candidate = index > 0 ? segments[index] : undefined

  return candidate && !nonVideoWords.has(candidate) ? candidate : undefined
}

export const extractDailymotionId = (link: string): string | undefined => {
  const url = parseUrl(link, placeholderBaseUrl)

  if (!url) {
    return
  }

  // Each candidate is validated on its own, so a path segment that is not an id still leaves
  // the geo player's `video` parameter to be read.
  return [readPathId(url, getPathSegments(url)), url.searchParams.get('video')]
    .map(readId)
    .find(Boolean)
}

export const composeEmbedUrl = (route: 'video' | 'playlist', id: string, query = ''): string => {
  return `https://www.dailymotion.com/embed/${route}/${id}${query}`
}

// The player url for a caller holding a url nothing has checked: a page builder stores whatever
// the publisher pasted, so the host is checked here the way the factory checks it for a carrier.
export const readDailymotionEmbedSrc = (link: string): string | undefined => {
  const url = parseUrlOnHosts(link, dailymotionHosts)
  const videoId = url && extractDailymotionId(url.href)

  return videoId ? composeEmbedUrl('video', videoId) : undefined
}

// Where playback starts, and the playlist the video sits in. The rest of the publisher's
// query is dropped with the rebuilt src.
// Neither player reads `autoplay` off the query: autostart comes from the saved configuration.
const dailymotionEmbedParams = ['start', 'playlist']

export const dailymotionResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractDailymotionId(url)

  if (videoId) {
    return {
      provider: 'dailymotion',
      id: videoId,
      src: composeEmbedUrl('video', videoId, pickUrlParams(url, dailymotionEmbedParams)),
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
      src: composeEmbedUrl('playlist', playlistId),
      url: `https://www.dailymotion.com/playlist/${playlistId}`,
    }
  }
}

// Dailymotion's player iframe for a video or a playlist, on its country hosts and dai.ly too.
export const dailymotionEmbedResolver = createUrlEmbedResolver(
  dailymotionHosts,
  dailymotionResolveEmbed,
)
