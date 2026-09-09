import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVar, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts, pickUrlParams, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'videopress'

// A guid is letters and digits, and a guid minted in 2009 for the Flash player still answers on
// the current routes. Only the alphabet is checked, since the guid is written into the player
// path: a wrong guid fails the same whether it is minted or passed through, and a length bound
// would refuse the next guid space.
const safeGuidRegex = /^[a-zA-Z0-9]+$/

// `video.wordpress.com` is the older alias of the same player, and the Flash player lived on
// `s0.videopress.com` and `v0.wordpress.com`. `wordpress.com` itself is not claimed: every
// wordpress.com blog frames its own posts on that domain, and those are cards, not video.
const videopressHosts = ['videopress.com', 'video.wordpress.com', 'v0.wordpress.com']

// Where playback starts, whether it loops, and whether the publisher asked for the HD
// rendition. The rest of the query the block editor writes (`cover`, `preloadContent`,
// `useAverageColor`) styles the player and goes with the rebuilt src.
const videopressEmbedParams = ['at', 'hd', 'loop']

// The carrier's `title` is not read. Jetpack writes its own player label there on every block
// embed (`VideoPress Video Player`, localised), and the older shortcode iframe states none, so
// on this platform the attribute never names the video. The title lives behind
// `public-api.wordpress.com/rest/v1.1/videos/{guid}`, which answers with no key and is what
// the enrichment key here is for. The poster is behind the same call, since its file name is
// not derivable from the guid.
const composeEmbed = (guid: string, query = ''): EmbedResolverResult => {
  return {
    provider,
    id: guid,
    src: `https://videopress.com/embed/${guid}${query}`,
    url: `https://videopress.com/v/${guid}`,
  }
}

// The player is `videopress.com/embed/{guid}` or its `video.wordpress.com` alias, and the
// page url `videopress.com/v/{guid}` frames the same player, which is how a page builder that
// pastes the share link ends up with a working iframe. Checked live 2026-08-16: the embed
// route answers 200 for a real guid and 404 for an invented one.
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

// The Flash player names the video in `flashvars="guid=…"` on the `<embed>`, or on the
// player's own query where the snippet inlined it, and the swf src carries only the player
// version. The guid is the same one the current player takes: a 2009 specimen's guid answers
// 200 on `/embed/`, `/v/` and the REST route today (checked 2026-08-16), so a carrier that has
// rendered nothing since Flash died becomes a working player.
const flashPlayerPathRegex = /\/player\.swf$/i

const videopressFlashResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  // Each guid is validated on its own: the Flash carrier states one in its flashvars and one on
  // its src, and the two disagree often enough that neither can be trusted to be the good one.
  const safeGuid = [flashVar(element, 'guid'), parsed.searchParams.get('guid')]
    .map((guid) => keepIfMatches(guid, safeGuidRegex))
    .find(Boolean)

  if (!safeGuid) {
    return
  }

  return composeEmbed(safeGuid)
}

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
