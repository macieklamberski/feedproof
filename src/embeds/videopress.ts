import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts, pickUrlParams, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'videopress'

const safeGuidRegex = /^[a-zA-Z0-9]+$/

const videopressHosts = ['videopress.com', 'video.wordpress.com', 'v0.wordpress.com']

const videopressEmbedParams = ['at', 'hd', 'loop']

const composeEmbed = (guid: string, query = ''): EmbedResolverResult => {
  return {
    provider,
    id: guid,
    src: `https://videopress.com/embed/${guid}${query}`,
    url: `https://videopress.com/v/${guid}`,
  }
}

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

  const safeGuid = [
    new URLSearchParams(flashVars(element)).get('guid'),
    parsed.searchParams.get('guid'),
  ]
    .map((guid) => keepIfMatches(guid, safeGuidRegex))
    .find(Boolean)

  if (!safeGuid) {
    return
  }

  return composeEmbed(safeGuid)
}

// The VideoPress Flash player: a player.swf embed naming the guid in flashvars, dead since Flash.
export const videopressFlashEmbedResolver = createUrlEmbedResolver(
  videopressHosts,
  videopressFlashResolveEmbed,
)

export const videopressRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoPlay: '1' },
}
