import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import {
  composeQuery,
  parseUrlOnHosts,
  pickQueryParams,
  placeholderBaseUrl,
} from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'vimeo'

const safeVideoIdRegex = /^\d+$/

const unlistedHashRegex = /^[0-9a-f]{10}$/

const vimeoHosts = ['vimeo.com']

const collectionPaths = new Set(['showcase', 'album', 'channels', 'groups', 'event', 'ondemand'])

const sitePathSegments = new Set([
  'about',
  'blog',
  'categories',
  'create',
  'features',
  'help',
  'join',
  'jobs',
  'log_in',
  'manage',
  'privacy',
  'search',
  'settings',
  'stock',
  'terms',
  'upgrade',
  'users',
  'watch',
])

const readCollectionVideoId = (segments: Array<string>): string | undefined => {
  if (segments[0] === 'showcase' || segments[0] === 'album') {
    return segments[2] === 'video' ? segments[3] : undefined
  }

  if (segments[0] === 'groups') {
    return segments[2] === 'videos' ? segments[3] : undefined
  }

  if (segments[0] === 'ondemand' || segments[0] === 'channels') {
    return segments.length === 3 ? segments[2] : undefined
  }
}

const showcasePaths = new Set(['showcase', 'album'])

const composeShowcaseEmbed = (showcaseId: string): EmbedResolverResult => {
  return {
    provider,
    id: `showcase/${showcaseId}`,
    src: `https://vimeo.com/showcase/${showcaseId}/embed`,
    url: `https://vimeo.com/showcase/${showcaseId}`,
  }
}

const resolveShowcaseEmbed = (link: string): EmbedResolverResult | undefined => {
  const url = parseUrl(link, placeholderBaseUrl)
  const segments = url ? getPathSegments(url) : []

  if (!showcasePaths.has(segments[0])) {
    return
  }

  const showcaseId = keepIfMatches(segments[1], safeVideoIdRegex)

  return showcaseId ? composeShowcaseEmbed(showcaseId) : undefined
}

type VimeoReference = {
  id: string
  hash?: string
}

const readReference = (link: string): VimeoReference | undefined => {
  const url = parseUrl(link, placeholderBaseUrl)

  if (!url) {
    return
  }

  const segments = getPathSegments(url)
  const clipId = url.searchParams.get('clip_id')

  if (clipId) {
    const id = keepIfMatches(clipId, safeVideoIdRegex)

    return id ? { id } : undefined
  }

  if (sitePathSegments.has(segments[0])) {
    return
  }

  if (collectionPaths.has(segments[0])) {
    const id = keepIfMatches(readCollectionVideoId(segments), safeVideoIdRegex)

    return id ? { id } : undefined
  }

  const hashIndex = segments.findIndex((segment, index) => {
    return (
      index > 0 && unlistedHashRegex.test(segment) && safeVideoIdRegex.test(segments[index - 1])
    )
  })
  const path = hashIndex === -1 ? segments : segments.slice(0, hashIndex)
  const id = keepIfMatches(
    path.findLast((segment) => safeVideoIdRegex.test(segment)),
    safeVideoIdRegex,
  )

  if (!id) {
    return
  }

  return {
    id,
    hash:
      hashIndex === -1
        ? keepIfMatches(url.searchParams.get('h'), unlistedHashRegex)
        : segments[hashIndex],
  }
}

export const extractVimeoId = (link: string): string | undefined => {
  return readReference(link)?.id
}

export const composeEmbedUrl = (
  videoId: string,
  params?: Record<string, string>,
  startSeconds?: string,
): string => {
  const query = composeQuery(params)
  const start = startSeconds ? `#t=${startSeconds}s` : ''

  return `https://player.vimeo.com/video/${videoId}${query}${start}`
}

export const readVimeoEmbedSrc = (link: string): string | undefined => {
  const url = parseUrlOnHosts(link, vimeoHosts)
  const videoId = url && extractVimeoId(url.href)

  return videoId ? composeEmbedUrl(videoId) : undefined
}

const vimeoEmbedParams = ['t']

export const vimeoResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const reference = readReference(url)

  if (!reference) {
    return resolveShowcaseEmbed(url)
  }

  const { id: videoId, hash } = reference
  const title = element ? attr(element, 'title') : undefined
  const params = {
    ...trimObject({ h: hash }, Boolean),
    ...pickQueryParams(parseUrl(url, placeholderBaseUrl)?.search ?? '', vimeoEmbedParams),
  }

  return {
    provider,
    id: hash ? `${videoId}:${hash}` : videoId,
    src: composeEmbedUrl(videoId, params),
    url: `https://vimeo.com/${videoId}${hash ? `/${hash}` : ''}`,
    title,
    // TODO: no thumbnail. Vimeo posters are not derivable from the id and need an oEmbed lookup.
  }
}

// A Vimeo player iframe, a frame of a video or showcase page, or the Flash moogaloop player.
export const vimeoEmbedResolver = createUrlEmbedResolver(vimeoHosts, vimeoResolveEmbed)

export const vimeoRenderHint: EmbedRenderHint = {
  provider,
  params: { dnt: '1' },
  autoplayParams: { autoplay: '1' },
}
