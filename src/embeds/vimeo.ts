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

// An unlisted video's privacy hash is ten lowercase hex characters, and case-sensitive.
const unlistedHashRegex = /^[0-9a-f]{10}$/

const vimeoHosts = ['vimeo.com']

// A showcase and an album are playlists, a channel and a group are listings, an event is a
// livestream and an on-demand page is a store front, and each lives in its own id space: channel
// 927 and video 927 are both live and belong to different people.
const collectionPaths = new Set(['showcase', 'album', 'channels', 'groups', 'event', 'ondemand'])

// Vimeo's own pages sit where a video id does, and some carry a numeric id of their own:
// `/users/{userId}` and `/manage/folders/{folderId}` both read as a video, and user 152184 is
// also video 152184, which belongs to somebody else.
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

// An event names its videos under `/videos/`, but its bare and `/embed` forms are the common ones
// and both would read as a video here.
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

// `album` is what Vimeo called a showcase before renaming them in 2018, and
// `vimeo.com/album/{id}/embed` 301s onto the showcase player.
const showcasePaths = new Set(['showcase', 'album'])

// The showcase player is a grid whose shape is whatever box the publisher gave it, and
// `vimeo.com/showcase/{id}` resolves through Vimeo's keyless oEmbed to a title, an author and a
// thumbnail.
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
  // The Flash player carried no id in the path at all: moogaloop.swf?clip_id={id}.
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

  // A ten-digit video id matches the hash shape, so only a segment after an id counts as one.
  const hashIndex = segments.findIndex((segment, index) => {
    return (
      index > 0 && unlistedHashRegex.test(segment) && safeVideoIdRegex.test(segments[index - 1])
    )
  })
  // The last numeric segment, which is the video in every remaining spelling: `/{id}`,
  // `/video/{id}` and the review pages.
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

// The player url every caller that recovers an id has to build. Params are given as values, not
// as a ready query string, so one carrying an `&` cannot open a parameter of its own. A start
// offset is not one of them: it travels in the fragment, in Vimeo's `{n}s` form.
export const composeEmbedUrl = (
  videoId: string,
  params?: Record<string, string>,
  startSeconds?: string,
): string => {
  const query = composeQuery(params)
  const start = startSeconds ? `#t=${startSeconds}s` : ''

  return `https://player.vimeo.com/video/${videoId}${query}${start}`
}

// The player url for a caller holding a url nothing has checked: a page builder stores whatever
// the publisher pasted, so the host is checked here the way the factory checks it for a carrier.
export const readVimeoEmbedSrc = (link: string): string | undefined => {
  const url = parseUrlOnHosts(link, vimeoHosts)
  const videoId = url && extractVimeoId(url.href)

  return videoId ? composeEmbedUrl(videoId) : undefined
}

// `t` is the start offset, in Vimeo's `{n}s` form.
const vimeoEmbedParams = ['t']

// The `title` a share snippet writes is usually the video's own title, but sometimes a player
// label. The labels are not filtered. They are localised into at least five languages and some
// name a plugin, not the platform, so any list of them goes stale.
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
    // The player takes the hash only as h=: the /video/{id}/{hash} path spelling is a 404.
    ...trimObject({ h: hash }, Boolean),
    ...pickQueryParams(parseUrl(url, placeholderBaseUrl)?.search ?? '', vimeoEmbedParams),
  }

  return {
    provider,
    // The hash travels in the id: an oEmbed lookup for the bare id answers 404.
    id: hash ? `${videoId}:${hash}` : videoId,
    src: composeEmbedUrl(videoId, params),
    // Without the hash the page loses its title and its poster, so it stays on the url too.
    url: `https://vimeo.com/${videoId}${hash ? `/${hash}` : ''}`,
    title,
    // TODO: no thumbnail. Vimeo posters are not derivable from the id and need an oEmbed lookup.
  }
}

// A Vimeo player iframe, a frame of a video or showcase page, or the Flash moogaloop player.
export const vimeoEmbedResolver = createUrlEmbedResolver(vimeoHosts, vimeoResolveEmbed)

// `dnt=1` turns off Vimeo's viewer tracking: no cookies and no analytics. `autoplay=1` starts
// playback on the click that loads the player. Never `background=1`, which mutes the video and
// strips its controls.
export const vimeoRenderHint: EmbedRenderHint = {
  provider,
  params: { dnt: '1' },
  autoplayParams: { autoplay: '1' },
}
