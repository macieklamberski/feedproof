import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^\d+$/

const vimeoHosts = ['vimeo.com', 'player.vimeo.com']

// Paths whose numeric id is not a video: a showcase is a playlist and an event is a livestream,
// and both live in their own id space, so the first numeric segment would mint a player for an
// unrelated video. 43 corpus feeds carry the two between them. Neither is resolved rather than
// resolved wrongly, since a showcase player and an event player take urls this resolver does not
// build.
const collectionPaths = new Set(['showcase', 'event'])

export const extractVimeoId = (link: string): string | undefined => {
  const segments = getPathSegments(link)

  if (collectionPaths.has(segments[0])) {
    return
  }

  // player.vimeo.com/video/{id}; otherwise the first numeric segment, which covers
  // vimeo.com/{id}, /channels/{name}/{id}, and /groups/{name}/videos/{id}. The Flash player
  // carried no id in the path at all: moogaloop.swf?clip_id={id}.
  const id =
    segments[0] === 'video'
      ? segments[1]
      : (segments.find((segment) => safeVideoIdRegex.test(segment)) ??
        parseUrl(link)?.searchParams.get('clip_id'))

  return keepIfMatches(id, safeVideoIdRegex)
}

// Unlisted videos embed with a `?h={hash}` token; the player rejects them without it. `t`
// is the start offset, in Vimeo's `{n}s` form.
const vimeoEmbedParams = ['h', 't']

// The `title` a share snippet writes is the video's own title about half the time and a player
// label the rest: measured across 1,590,608 corpus feeds, 2,165 Vimeo iframes state a title and
// 277 of those are a label. The labels are not filtered. They are localised into at least five
// languages and some name a plugin rather than the platform, so any list of them is a list that
// goes stale, and feedsweep's job is to carry what the source states rather than to judge it.
export const vimeoResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const videoId = extractVimeoId(url)

  if (!videoId) {
    return
  }

  const title = element ? attr(element, 'title') : undefined

  return {
    provider: 'vimeo',
    id: videoId,
    src: `https://player.vimeo.com/video/${videoId}${pickUrlParams(url, vimeoEmbedParams)}`,
    url: `https://vimeo.com/${videoId}`,
    ...(title && { title }),
    // TODO: no thumbnail yet. Vimeo posters aren't derivable from the id (the URL
    // carries an opaque hash), so they need an oEmbed lookup
    // (https://vimeo.com/api/oembed.json?url=...) wired through enrichEmbedFn.
  }
}

export const vimeoEmbedResolver = createUrlEmbedResolver(vimeoHosts, vimeoResolveEmbed)
