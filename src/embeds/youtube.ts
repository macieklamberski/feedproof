import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import {
  composeQuery,
  parseUrlOnHosts,
  pickUrlParams,
  placeholderBaseUrl,
  splitStrayParams,
} from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'youtube'

const safeVideoIdRegex = /^[a-zA-Z0-9_-]{11}$/

const strayLeadingQuoteRegex = /^(?:%22|")/

const nonVideoIds = new Set(['videoseries', 'live_stream'])

const pathWords = new Set([
  'shorts',
  'embed',
  'live',
  'watch',
  'video',
  'v',
  'e',
  'w',
  'watch_popup',
  'apiplayer',
  'get_video_info',
])

const queryIdParams = ['v', 'vi', 'video_id']

const hashbangIdRegex = /^#!(?:.*?[&;])?vi?=([^&;]+)/
const gridFragmentIdRegex = /^#p\/.+\/([0-9A-Za-z_-]{11})$/

const youtubeHosts = ['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'youtube.googleapis.com']

export const isVideoId = (value: string): boolean => {
  return safeVideoIdRegex.test(value) && !nonVideoIds.has(value)
}

// TODO: prefer a higher-res thumbnail where one exists, which needs a HEAD probe per video.
export const composeThumbnailUrl = (videoId: string): string => {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export const composeEmbedUrl = (videoId: string, params?: Record<string, string>): string => {
  const query = composeQuery(params)

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

  return index > 0 ? segments[index] : undefined
}

export const extractVideoId = (link: string): string | undefined => {
  const url = parseUrl(link, placeholderBaseUrl)

  if (!url) {
    return
  }

  const candidates = [
    readPathId(url),
    ...queryIdParams.map((param) => url.searchParams.get(param)),
    url.hash.match(hashbangIdRegex)?.[1],
    url.hash.match(gridFragmentIdRegex)?.[1],
  ]

  return candidates
    .map((candidate) =>
      candidate ? splitStrayParams(candidate.replace(strayLeadingQuoteRegex, '')).head : undefined,
    )
    .find((candidate) => !!candidate && isVideoId(candidate))
}

export const readYoutubeEmbedSrc = (link: string): string | undefined => {
  const url = parseUrlOnHosts(link, youtubeHosts)
  const videoId = url && extractVideoId(url.href)

  return videoId ? composeEmbedUrl(videoId) : undefined
}

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

const safePlaylistChannelIdRegex = /^[a-zA-Z0-9_-]+$/

const legacyPlaylistIdRegex = /^[0-9A-F]{16}$/

const playerRatio = '16/9'

const composeListEmbed = (list: string): EmbedResolverResult => {
  return {
    provider,
    id: `playlist/${list}`,
    src: composeEmbedUrl('videoseries', { list }),
    url: `https://www.youtube.com/playlist?list=${list}`,
    ratio: playerRatio,
  }
}

const composeUploadsEmbed = (user: string): EmbedResolverResult => {
  return {
    provider,
    id: `user/${user}`,
    src: `https://www.youtube.com/embed?listType=user_uploads&list=${user}`,
    url: `https://www.youtube.com/user/${user}`,
    ratio: playerRatio,
  }
}

const composeChannelEmbed = (channel: string): EmbedResolverResult => {
  return {
    provider,
    id: `channel/${channel}`,
    src: composeEmbedUrl('live_stream', { channel }),
    url: `https://www.youtube.com/channel/${channel}`,
    ratio: playerRatio,
  }
}

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

  if (listType === 'search' || !list || !safePlaylistChannelIdRegex.test(list)) {
    return
  }

  return listType === 'user_uploads' ? composeUploadsEmbed(list) : composeListEmbed(list)
}

export const youtubeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, placeholderBaseUrl)
  const segments = parsed ? getPathSegments(parsed) : []

  if (segments[0] === 'embed' && parsed) {
    const embed = resolveCollectionEmbed(parsed, segments)

    if (embed || segments.length === 1 || nonVideoIds.has(segments[1])) {
      return embed
    }
  }

  if (segments[0] === 'p') {
    const list = splitStrayParams(segments[1] ?? '').head

    return legacyPlaylistIdRegex.test(list) ? composeListEmbed(`PL${list}`) : undefined
  }

  const videoId = extractVideoId(url)

  if (!videoId) {
    return
  }

  return {
    provider,
    id: videoId,
    src: `${composeEmbedUrl(videoId)}${pickUrlParams(url, youtubeEmbedParams)}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: composeThumbnailUrl(videoId),
    ratio: playerRatio,
  }
}

// A YouTube player iframe, a frame of a watch, shorts or playlist page, or the Flash player.
export const youtubeIframeEmbedResolver = createUrlEmbedResolver(
  youtubeHosts,
  youtubeResolveEmbed,
  { preferResolverSize: true },
)

// AMP's amp-youtube names the video in data-videoid and renders nothing without the AMP runtime.
export const youtubeAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-youtube[data-videoid], amp-youtube[data-live-channelid]',
  (element) => {
    const videoId = attr(element, 'data-videoid')

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
      provider,
      id: videoId,
      src: composeEmbedUrl(videoId, params),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: composeThumbnailUrl(videoId),
      ratio: playerRatio,
    }
  },
  { preferResolverSize: true },
)

export const youtubeRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1', enablejsapi: '1' },
}
