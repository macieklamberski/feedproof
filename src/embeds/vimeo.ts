import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { pickQueryParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^\d+$/

// An unlisted video's privacy hash, which the player takes only in the query: the
// `player.vimeo.com/video/{id}/{hash}` path spelling is a 404. Ten lowercase hex characters, and
// case-sensitive, so it travels exactly as written.
const unlistedHashRegex = /^[0-9a-f]{10}$/

const vimeoHosts = ['vimeo.com', 'player.vimeo.com']

// Paths whose leading numeric id is not a video: a showcase and an album are playlists, an event
// is a livestream and an on-demand page is a store front, and each lives in its own id space, so
// that id would mint a player for an unrelated video. A collection can still name a real video
// deeper in its path, which is what readCollectionVideoId reads.
const collectionPaths = new Set(['showcase', 'album', 'event', 'ondemand'])

// An album spells it `/album/{albumId}/video/{videoId}` and a showcase the same way, while an
// on-demand page puts the video straight after its own segment. An event names its videos under
// `/videos/`, but its bare and `/embed` forms are the common ones and both would read as a video
// here, so the event player keeps going to the generic placeholder.
const readCollectionVideoId = (segments: Array<string>): string | undefined => {
  if (segments[0] === 'showcase' || segments[0] === 'album') {
    return segments[2] === 'video' ? segments[3] : undefined
  }

  if (segments[0] === 'ondemand') {
    return segments.length === 3 ? segments[2] : undefined
  }
}

// A showcase is a playlist with its own player and its own id space, and `album` is what Vimeo
// called one before renaming them in 2018. The album spelling is normalised away here because
// `vimeo.com/album/{id}/embed` 301s onto the showcase player. oEmbed settles nothing either way:
// it answers the two spellings of one id identically, down to the byte, live or dead alike.
const showcasePaths = new Set(['showcase', 'album'])

// No video id, so no poster, and no size: the showcase player is a grid whose shape is whatever
// box the publisher gave it, and the carrier already states one. What the resolver adds is the
// enrichment key, since `vimeo.com/showcase/{id}` resolves through Vimeo's keyless oEmbed to a
// title, an author and a thumbnail, and a fabricated id answers 404 there (probed 2026-09-06).
// The id is qualified because a showcase and a video share one numeric grammar.
const composeShowcaseEmbed = (showcaseId: string): EmbedResolverResult => {
  return {
    provider: 'vimeo',
    id: `showcase/${showcaseId}`,
    src: `https://vimeo.com/showcase/${showcaseId}/embed`,
    url: `https://vimeo.com/showcase/${showcaseId}`,
  }
}

const resolveShowcaseEmbed = (link: string): EmbedResolverResult | undefined => {
  const url = parseUrl(link)
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
  const url = parseUrl(link)

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

  if (collectionPaths.has(segments[0])) {
    const id = keepIfMatches(readCollectionVideoId(segments), safeVideoIdRegex)

    return id ? { id } : undefined
  }

  // The hash follows the id it unlocks. A ten-digit video id matches the hash shape on its own,
  // so a segment counts as one only where a video id comes directly before it.
  const hashIndex = segments.findIndex((segment, index) => {
    return (
      index > 0 && unlistedHashRegex.test(segment) && safeVideoIdRegex.test(segments[index - 1])
    )
  })
  // The last numeric segment, which is the video in every remaining spelling: `/{id}`,
  // `/video/{id}`, `/channels/{name}/{id}`, `/groups/{name}/videos/{id}` and the review pages.
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
    hash: (hashIndex === -1 ? url.searchParams.get('h') : segments[hashIndex]) ?? undefined,
  }
}

export const extractVimeoId = (link: string): string | undefined => {
  return readReference(link)?.id
}

// `t` is the start offset, in Vimeo's `{n}s` form. The unlisted hash is carried by the reference
// rather than picked from the query, because it also arrives as a path segment.
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
  const query = new URLSearchParams({
    ...(hash && { h: hash }),
    ...pickQueryParams(parseUrl(url)?.search ?? '', vimeoEmbedParams),
  }).toString()

  return {
    provider: 'vimeo',
    // Vimeo's own identity for an unlisted video joins the two with a colon, and the hash has to
    // travel with the id: an oEmbed lookup for the bare id answers 404.
    id: hash ? `${videoId}:${hash}` : videoId,
    src: `https://player.vimeo.com/video/${videoId}${query ? `?${query}` : ''}`,
    // Without the hash the page loses its title and its poster, so it stays on the url too.
    url: `https://vimeo.com/${videoId}${hash ? `/${hash}` : ''}`,
    title,
    // TODO: no thumbnail yet. Vimeo posters aren't derivable from the id (the URL
    // carries an opaque hash), so they need an oEmbed lookup
    // (https://vimeo.com/api/oembed.json?url=...) wired through enrichEmbedFn.
  }
}

export const vimeoEmbedResolver = createUrlEmbedResolver(vimeoHosts, vimeoResolveEmbed)

// Starts playback on the click that loads the player. Never `background=1`, which mutes the
// video and strips its controls.
export const vimeoRenderHint: EmbedRenderHint = {
  provider: 'vimeo',
  autoplayParams: { autoplay: '1' },
}
