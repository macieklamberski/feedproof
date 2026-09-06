import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { pickUrlParams, splitStrayParams } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^[a-zA-Z0-9_-]{11}$/

// Some feeds (Steam news) leak the opening quote of the source `[previewyoutube="id]`
// bbcode into the embed src, so it arrives as `/embed/"{id}`: the quote reaches the id
// as a literal `"` (from a param) or percent-encoded `%22` (from a path segment). Strip a
// leading stray quote so the real 11-char id still resolves instead of the video being
// dropped to the generic iframe handler.
const strayLeadingQuoteRegex = /^(?:%22|")/

// `videoseries` (playlist embeds) and `live_stream` (channel live embeds) are YouTube embed
// path-words, not video ids, but each is coincidentally 11 valid id chars, so it passes
// safeVideoIdRegex. Excluded here so extractVideoId never mistakes one for a video (a bogus
// watch url and thumbnail). youtubeResolveEmbed handles them as playlist/live embeds below.
const nonVideoIds = new Set(['videoseries', 'live_stream'])

// Segments that name a route rather than a video. A url can stack two of them: `/embed/watch?v=`
// and `/embed/shorts/{id}` are authoring mistakes that YouTube answers with a player page which
// cues nothing, and each still names the video after the stack.
const pathWords = new Set([
  'shorts',
  'embed',
  'live',
  'watch',
  'video', // The old share url; redirects to /watch today.
  'v', // The Flash player path, shipped in pre-2010 object/embed markup.
  'e', // A short-lived embed alias from the same era.
  'w', // A watch alias of the same era; still serves the video today.
  'watch_popup',
  'apiplayer', // The Flash-era chromeless players. Both endpoints are dead, and both
  'get_video_info', // name the video in the query rather than the path.
])

const queryIdParams = ['v', 'vi', 'video_id']

// The 2010 AJAX site and the profile grids of the same era kept the video id in the fragment
// (`/watch#!v={id}`, `/user/{name}#p/u/1/{id}`), so the server-side path names no video. The
// links survive in old posts, and the hash still says which video was meant.
const hashbangIdRegex = /^#!(?:.*?[&;])?vi?=([^&;]+)/
const gridFragmentIdRegex = /^#p\/.+\/([0-9A-Za-z_-]{11})$/

// `youtube.googleapis.com/v/{id}` is the Flash player's other host, still shipped by Blogger
// feeds of that era.
const youtubeHosts = ['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'youtube.googleapis.com']

// A bare id, already separated from any url: the right shape, and not one of the embed path
// words that share it.
export const isVideoId = (value: string): boolean => {
  return safeVideoIdRegex.test(value) && !nonVideoIds.has(value)
}

// hqdefault always exists for a video, so it's the safe default. Higher-res variants
// (maxresdefault, sddefault) give a sharper poster but only exist for some videos, so
// we can't pick them blindly.
// TODO: detect and prefer a higher-res thumbnail when present. The best available
// resolution varies per video, so it needs a probe (HEAD request) rather than a guess.
export const composeThumbnailUrl = (videoId: string): string => {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

// The player url every transform that recovers an id has to build. Params are given as values,
// not as a ready query string, so they get encoded here, and one carrying an `&` cannot open a
// parameter of its own.
export const composeEmbedUrl = (videoId: string, params?: Record<string, string>): string => {
  const query = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : ''

  return `https://www.youtube.com/embed/${videoId}${query}`
}

const readPathId = (url: URL): string | undefined => {
  const segments = getPathSegments(url)

  if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) {
    return segments[0]
  }

  let index = 0

  while (index < segments.length && pathWords.has(segments[index])) {
    index++
  }

  // A path opening with no route word names no video: a bare vanity channel url would otherwise
  // read as one whenever the name happens to be eleven legal characters.
  return index > 0 ? segments[index] : undefined
}

export const extractVideoId = (link: string): string | undefined => {
  const url = parseUrl(link)

  if (!url) {
    return
  }

  // Every place a url can name its video, in the order the platform's own forms prefer. Each is
  // checked on its own, so a segment that looks like an id but is not, as a channel name does,
  // falls through to the next rather than ending the search.
  const candidates = [
    readPathId(url),
    ...queryIdParams.map((param) => url.searchParams.get(param)),
    url.hash.match(hashbangIdRegex)?.[1],
    url.hash.match(gridFragmentIdRegex)?.[1],
  ]

  return (
    candidates
      // The Flash player wrote `/v/{id}&hl=en_US&fs=1`, so the id is the segment's head.
      .map((candidate) =>
        candidate
          ? splitStrayParams(candidate.replace(strayLeadingQuoteRegex, '')).head
          : undefined,
      )
      .find((candidate) => !!candidate && isVideoId(candidate))
  )
}

// Parameters that change what the player shows; everything else the publisher wrote, autoplay,
// `rel`, `si` and other tracking, is dropped with the rest of the original query. A clip embed
// needs both `clip` and `clipt`, and `loop` does nothing without `playlist`, which in the wild
// is almost always the video's own id: YouTube's documented way to loop a single video.
export const youtubeEmbedParams = [
  'start',
  'end',
  'list',
  'index',
  'clip',
  'clipt',
  'playlist',
  'loop',
]

// Playlist (`list`), channel (`channel`) and legacy username ids. A charset guard, not a
// length/prefix one: it only keeps a stray value out of the rebuilt url and the enrichment key.
const safePlaylistChannelIdRegex = /^[a-zA-Z0-9_-]+$/

// The Flash-era playlist player wrote `youtube.com/p/{id}`, where the id is the same playlist
// the modern url spells as `list=PL{id}`: 262 of the 263 distinct ids in the corpus are exactly
// 16 uppercase hex characters, and the odd one is a bare `/p/` naming nothing. Probed 2026-09-06:
// `playlist?list=PL7BE4DDAC0A0D31AF` opens the playlist the specimen's post is about, while the
// same id without the prefix 404s.
const legacyPlaylistIdRegex = /^[0-9A-F]{16}$/

const playerRatio = '16/9'

// A playlist or channel live embed is not a single video: it has no video id, no single poster
// and no `watch?v=` page. Each keeps a working src and a canonical url, posterless, and its
// list, channel or username becomes the enrichment key (a playlist resolves title and poster
// through YouTube's keyless oEmbed, a channel through the Data API).
const composeListEmbed = (list: string): EmbedResolverResult => {
  return {
    provider: 'youtube',
    id: list,
    src: composeEmbedUrl('videoseries', { list }),
    url: `https://www.youtube.com/playlist?list=${list}`,
    ratio: playerRatio,
  }
}

// `listType=user_uploads` takes a legacy username in place of a playlist id, so the src stays
// in the form the player understands rather than becoming a videoseries url.
const composeUploadsEmbed = (user: string): EmbedResolverResult => {
  return {
    provider: 'youtube',
    id: user,
    src: `https://www.youtube.com/embed?listType=user_uploads&list=${user}`,
    url: `https://www.youtube.com/user/${user}`,
    ratio: playerRatio,
  }
}

const composeChannelEmbed = (channel: string): EmbedResolverResult => {
  return {
    provider: 'youtube',
    id: channel,
    src: composeEmbedUrl('live_stream', { channel }),
    url: `https://www.youtube.com/channel/${channel}`,
    ratio: playerRatio,
  }
}

// The playlist and channel embeds, which name their content in the query rather than in a video
// id. `/embed/videoseries?list=` and the bare `/embed/?list=` some WordPress plugins emit are the
// same playlist spelled two ways.
const resolveCollectionEmbed = (
  parsed: URL,
  segments: Array<string>,
): EmbedResolverResult | undefined => {
  const listType = parsed.searchParams.get('listType')
  const list = parsed.searchParams.get('list')
  const channel = parsed.searchParams.get('channel')

  if (segments[1] === 'live_stream') {
    return channel && safePlaylistChannelIdRegex.test(channel)
      ? composeChannelEmbed(channel)
      : undefined
  }

  if (segments[1] !== 'videoseries' && segments.length !== 1) {
    return
  }

  // `listType=search` named a search query, not an id, and YouTube removed it in 2020: the
  // embed plays nothing and there is nothing to resolve it to.
  if (listType === 'search' || !list || !safePlaylistChannelIdRegex.test(list)) {
    return
  }

  return listType === 'user_uploads' ? composeUploadsEmbed(list) : composeListEmbed(list)
}

export const youtubeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)
  const segments = parsed ? getPathSegments(parsed) : []

  if (segments[0] === 'embed' && parsed) {
    const embed = resolveCollectionEmbed(parsed, segments)

    // A `/embed/{id}` path names a video and falls through; the rest of the embed paths name
    // their content here or name nothing resolvable.
    if (embed || segments.length === 1 || nonVideoIds.has(segments[1])) {
      return embed
    }
  }

  // The Flash player took its playlist on `/p/`, and the swf it points at is dead, so the id is
  // the only thing left to rebuild from. The publisher's `?hl=` and `&fs=1` are player chrome and
  // go with the rest of the query.
  if (segments[0] === 'p') {
    const list = splitStrayParams(segments[1] ?? '').head

    return legacyPlaylistIdRegex.test(list) ? composeListEmbed(`PL${list}`) : undefined
  }

  const videoId = extractVideoId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'youtube',
    id: videoId,
    src: `${composeEmbedUrl(videoId)}${pickUrlParams(url, youtubeEmbedParams)}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: composeThumbnailUrl(videoId),
    ratio: playerRatio,
  }
}

export const youtubeIframeEmbedResolver = createUrlEmbedResolver(
  youtubeHosts,
  youtubeResolveEmbed,
  { preferResolverSize: true },
)

// AMP's own YouTube element. It renders nothing without the AMP runtime, and the id it names in
// `data-videoid` is the entire embed. AMP hands player parameters to the iframe as
// `data-param-{name}`, which are the same query parameters an ordinary embed url spells, so the
// same set is carried over and the rest is dropped the same way.
export const youtubeAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-youtube[data-videoid], amp-youtube[data-live-channelid]',
  (element) => {
    const videoId = attr(element, 'data-videoid')

    // `data-live-channelid` is AMP's spelling of the channel live embed, and the element states
    // one or the other. A malformed video id is refused rather than falling back to the channel:
    // the element named a video, so the channel would be a guess at what was meant.
    if (!videoId) {
      const channel = attr(element, 'data-live-channelid')

      return channel && safePlaylistChannelIdRegex.test(channel)
        ? composeChannelEmbed(channel)
        : undefined
    }

    if (!isVideoId(videoId)) {
      return
    }

    const params: Record<string, string> = {}

    for (const name of youtubeEmbedParams) {
      const value = attr(element, `data-param-${name}`)

      if (value) {
        params[name] = value
      }
    }

    return {
      provider: 'youtube',
      id: videoId,
      src: composeEmbedUrl(videoId, params),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: composeThumbnailUrl(videoId),
      ratio: playerRatio,
    }
  },
  { preferResolverSize: true },
)

// What a reader appends to start playback on the click that loads the player.
export const youtubeRenderHint: EmbedRenderHint = {
  provider: 'youtube',
  autoplayParams: { autoplay: '1', enablejsapi: '1' },
}
