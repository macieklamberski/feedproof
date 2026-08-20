import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { pickUrlParams } from '../utils/urls.js'
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

// The Flash player took its parameters with `&` and no `?`, so `/v/{id}&hl=en_US&fs=1`
// arrives as one path segment and the id fails the length check. Browsers read the leading
// id out of it, and so does this.
const strayParamsRegex = /&.*$/

const pathIdSegments = ['shorts', 'embed', 'live', 'v']

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

  const cleanedId = id?.replace(strayLeadingQuoteRegex, '').replace(strayParamsRegex, '')

  if (cleanedId && isVideoId(cleanedId)) {
    return cleanedId
  }
}

// Parameters that change what the player shows, so a rebuilt src has to carry them: where
// playback starts and ends, which playlist the video sits in and at which position, and the
// window of a clip (`clip` is the clip id, `clipt` its encoded bounds: a clip embed needs
// both). Everything else the publisher wrote, autoplay, `rel`, `si` and other tracking, is
// dropped with the rest of the original query.
export const youtubeEmbedParams = ['start', 'end', 'list', 'index', 'clip', 'clipt']

// Playlist (`list`) and channel (`channel`) ids. A charset guard, not a length/prefix one:
// it only keeps a stray value out of the rebuilt url and the enrichment key.
const safePlaylistChannelIdRegex = /^[a-zA-Z0-9_-]+$/

const playerRatio = '16/9'

export const youtubeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)
  const segments = parsed ? getPathSegments(parsed) : []

  // A playlist or channel live embed is not a single video: it has no video id, no single
  // poster, and no `watch?v=` page. Keep the working src and give a canonical playlist/channel
  // url, posterless. The id is the list/channel id: kept as the enrichment key (a playlist
  // resolves title + poster via YouTube's keyless oEmbed; a channel via the Data API).
  if (segments[0] === 'embed' && parsed) {
    if (segments[1] === 'videoseries') {
      const list = parsed.searchParams.get('list')

      if (list && safePlaylistChannelIdRegex.test(list)) {
        return {
          provider: 'youtube',
          id: list,
          src: composeEmbedUrl('videoseries', { list }),
          url: `https://www.youtube.com/playlist?list=${list}`,
          ratio: playerRatio,
        }
      }

      return
    }

    if (segments[1] === 'live_stream') {
      const channel = parsed.searchParams.get('channel')

      if (channel && safePlaylistChannelIdRegex.test(channel)) {
        return {
          provider: 'youtube',
          id: channel,
          src: composeEmbedUrl('live_stream', { channel }),
          url: `https://www.youtube.com/channel/${channel}`,
          ratio: playerRatio,
        }
      }

      return
    }
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
  {
    declaredSize: false,
  },
)

// AMP's own YouTube element. It renders nothing without the AMP runtime, and the id it names in
// `data-videoid` is the entire embed. AMP hands player parameters to the iframe as
// `data-param-{name}`, which are the same query parameters an ordinary embed url spells, so the
// same set is carried over and the rest is dropped the same way.
//
// `data-live-channelid` (the channel-live variant) is deliberately not read: it occurs in no
// corpus feed, and the element states no video to mint a poster or a watch url from.
export const youtubeAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-youtube[data-videoid]',
  (element) => {
    const videoId = attr(element, 'data-videoid')

    if (!videoId || !isVideoId(videoId)) {
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
  { declaredSize: false },
)
