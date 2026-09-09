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

const safeVideoIdRegex = /^[a-zA-Z0-9]+$/

const dailymotionHosts = [
  'dailymotion.com',
  'dailymotion.co.uk',
  'dailymotion.es',
  'dailymotion.fr',
  'dailymotion.it',
  'dai.ly',
]

const pathWords = new Set(['embed', 'video', 'swf'])

const localeRegex = /^[a-z]{2}$/

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

const readId = (candidate: Nullish<string>): string | undefined => {
  const head = candidate && splitStrayParams(candidate).head.split('_')[0]

  return keepIfMatches(head, safeVideoIdRegex)
}

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
  if (url.hostname === 'dai.ly' || url.hostname.endsWith('.dai.ly')) {
    return segments[0]
  }

  const index = skipRouteWords(segments)

  const candidate = index > 0 ? segments[index] : undefined

  return candidate && !nonVideoWords.has(candidate) ? candidate : undefined
}

export const extractDailymotionId = (link: string): string | undefined => {
  const url = parseUrl(link, placeholderBaseUrl)

  if (!url) {
    return
  }

  return [readPathId(url, getPathSegments(url)), url.searchParams.get('video')]
    .map(readId)
    .find(Boolean)
}

export const composeEmbedUrl = (route: 'video' | 'playlist', id: string, query = ''): string => {
  return `https://www.dailymotion.com/embed/${route}/${id}${query}`
}

export const readDailymotionEmbedSrc = (link: string): string | undefined => {
  const url = parseUrlOnHosts(link, dailymotionHosts)
  const videoId = url && extractDailymotionId(url.href)

  return videoId ? composeEmbedUrl('video', videoId) : undefined
}

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
