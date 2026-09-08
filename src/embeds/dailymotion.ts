import { getPathSegments, type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { pickUrlParams, placeholderBaseUrl, splitStrayParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Dailymotion's own alphabet, with no length. A `{5,}` floor sat here and refused real videos:
// the platform's oldest ids are four characters, and `x13i` (uploaded 2005-07-25) still answers
// with a title, a player and a thumbnail. What the floor was doing by accident was refusing the
// four-letter route words, which `nonVideoWords` now names one by one.
const safeVideoIdRegex = /^[a-zA-Z0-9]+$/

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

// `/embed/{locale}/video/{id}` serves the player and redirects to
// `geo.dailymotion.com/player.html?video={id}`, checked 2026-09-07 for ar, ca, de, en, es, fr,
// he, id, it, nl, pl, pt, ro, ru, th, tr and vi, with `ja` and an invented `zz` answering 404.
// The shape is read rather than that list, which would start refusing the next language added.
const localeRegex = /^[a-z]{2}$/

// Kinds Dailymotion's embed route serves besides a video, so the segment names a listing or a
// landing page and never a video. Measured 2026-09-07 against `/embed/{word}/x7tgad0`: only
// `video` and `playlist` reach the player carrying the id, each word below reaches it with an
// empty `video=` or redirects to a page, and every other word answers a real 404. They are the
// retired 2008-era listing embeds, so this records what was probed rather than betting that the
// catalogue is frozen. `/embed/playlist/{id}` would otherwise yield the literal `playlist`,
// which is eight legal characters and passes the id test on length alone.
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

// A locale is stepped over only where a route word follows it, so `/embed/fr/video/{id}` reaches
// the id while a two-letter account name at the head of a path still names no video. The word may
// be a listing one: `/embed/fr/playlist/{id}` loses the playlist and loads an empty player, so the
// id has to reach the playlist reader for the working url to be minted.
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

// Share urls append a `_title-slug` to the id and the platform strips it itself:
// `api.dailymotion.com/playlist/x5zhzj_long-playlist` and `/video/x7tgad0_some-slug` answer
// byte identically to their bare ids, while an invented id 404s either way (checked 2026-09-08).
// The Flash player wrote `/swf/{id}&colors=…`, so the stray query rides on the segment too.
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

  // The word is read where the route prefix ends rather than found anywhere in the path. Scanning
  // read `/search/playlist/videos`, the search page for the word, as a playlist called `videos`,
  // and `/embed/{account}/playlist/{id}` answers a real 404, so no working form sits deeper.
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

// The player url every caller that recovers an id has to build. A video and a playlist are
// separate players sharing one id grammar, so the route is named rather than assumed, and the
// query arrives ready to append from `pickUrlParams`.
export const composeEmbedUrl = (route: 'video' | 'playlist', id: string, query = ''): string => {
  return `https://www.dailymotion.com/embed/${route}/${id}${query}`
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
      src: composeEmbedUrl('video', videoId, pickUrlParams(url, dailymotionEmbedParams)),
      url: `https://www.dailymotion.com/video/${videoId}`,
      thumbnail: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
      // Not the player's shape: it fills whatever frame it gets, at 320, 640 and 1280 wide alike,
      // measured 2026-09-07 in Chrome on `x7tgad0`, whose own API states 1280x720. It is the
      // corpus shape of the carriers: of 1,011 `dailymotion.com/embed` iframes across 396 sampled
      // feeds, 813 state a box, 511 of those 16:9, 51 4:3, 251 another landscape shape and none
      // portrait; 10 state a height alone and 188 state nothing, which is where this fires, since
      // `decideSize` takes the carrier's size first.
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

export const dailymotionEmbedResolver = createUrlEmbedResolver(
  dailymotionHosts,
  dailymotionResolveEmbed,
)

// No autoplay hint. The runtime-parameter docs list `autoplay`, but neither player url reads it
// off the query: the legacy `/embed/video/` url redirects to the new player and the redirect
// drops it, and the new player takes autostart from the saved player configuration alone.
