import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVar, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts, pickUrlParams, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'videopress'

// A guid is letters and digits, and one minted in 2009 for the Flash player still answers on the
// current routes.
const safeGuidRegex = /^[a-zA-Z0-9]+$/

// Not wordpress.com itself: every blog frames its posts on that domain, and those are cards.
// `video.wordpress.com` is the older alias of the same player, and the Flash player lived on
// `s0.videopress.com` and `v0.wordpress.com`.
const videopressHosts = ['videopress.com', 'video.wordpress.com', 'v0.wordpress.com']

// Where playback starts, whether it loops, and whether the publisher asked for the HD
// rendition. The rest of the query the block editor writes (`cover`, `preloadContent`,
// `useAverageColor`) styles the player and goes with the rebuilt src.
const videopressEmbedParams = ['at', 'hd', 'loop']

const composeEmbed = (guid: string, query = ''): EmbedResolverResult => {
  return {
    provider,
    id: guid,
    src: `https://videopress.com/embed/${guid}${query}`,
    url: `https://videopress.com/v/${guid}`,
  }
}

// The carrier's title is Jetpack's player label, VideoPress Video Player, not the video's name.
// The title and the poster live behind `public-api.wordpress.com/rest/v1.1/videos/{guid}`, which
// answers with no key.
const videopressResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const [route, guid] = getPathSegments(link)

  if (route !== 'embed' && route !== 'v') {
    return
  }

  const safeGuid = keepIfMatches(guid, safeGuidRegex)

  if (!safeGuid) {
    return
  }

  return composeEmbed(safeGuid, pickUrlParams(link, videopressEmbedParams))
}

// A VideoPress player iframe, or a frame of its /v/ page, which serves the same player.
export const videopressIframeEmbedResolver = createUrlEmbedResolver(
  videopressHosts,
  videopressResolveEmbed,
)

// The player url for a caller holding a url nothing has checked: a page builder stores whatever
// the publisher pasted, so the host is checked here the way the factory checks it for a carrier.
export const readVideopressEmbedSrc = (link: string): string | undefined => {
  const url = parseUrlOnHosts(link, videopressHosts)

  return url ? videopressResolveEmbed(url.href)?.src : undefined
}

const flashPlayerPathRegex = /\/player\.swf$/i

const videopressFlashResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  // Each guid is checked on its own: the flashvars one and the src one disagree often.
  const safeGuid = [flashVar(element, 'guid'), parsed.searchParams.get('guid')]
    .map((guid) => keepIfMatches(guid, safeGuidRegex))
    .find(Boolean)

  if (!safeGuid) {
    return
  }

  return composeEmbed(safeGuid)
}

// The VideoPress Flash player: a player.swf embed naming the guid in flashvars, dead since Flash.
// The guid sits in `flashvars="guid=…"` on the `<embed>`, or on the player's own query where the
// snippet inlined it, and the swf src carries only the player version.
export const videopressFlashEmbedResolver = createUrlEmbedResolver(
  videopressHosts,
  videopressFlashResolveEmbed,
)

// Starts playback on the click that loads the player. The player's routes read the boolean
// keys `1`, `true` and empty, and alias `autoplay` to this spelling.
export const videopressRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoPlay: '1' },
}
