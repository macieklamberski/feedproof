import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { pickUrlParams } from '../utils/urls.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

// Music and podcasts embed through the same player, served from `embed.music.apple.com` and
// `embed.podcasts.apple.com`, so both resolve here and only the provider name differs. The
// player is fluid-width with the fixed height Apple's own embed code carries. It is a fallback
// for the shapes that ship no size: a height the markup declares wins over it.
const appleEmbedHeight = 450

const appleHosts = ['music.apple.com', 'podcasts.apple.com']
const applePodcastsHost = 'podcasts.apple.com'

// The path is `/{storefront}/{kind}/{slug}/{id}`, with the storefront and the slug both
// optional. A music id is numeric, a playlist id carries a `pl.` prefix and a podcast id an
// `id` one.
const storefrontRegex = /^[a-z]{2}$/
const safeIdRegex = /^(?:id\d+|pl\.[a-zA-Z0-9]+|\d+)$/
const podcastIdPrefixRegex = /^id/

const appleKinds = new Set(['album', 'song', 'music-video', 'playlist', 'podcast'])

export const appleResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed || (!isHostOf(parsed, appleHosts) && !isSubdomainOf(parsed, appleHosts))) {
    return
  }

  const segments = getPathSegments(parsed)
  const [kind, ...rest] = storefrontRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const pathId = rest[rest.length - 1]

  if (!kind || !pathId || !appleKinds.has(kind) || !safeIdRegex.test(pathId)) {
    return
  }

  const isPodcast = isHostOf(parsed, applePodcastsHost) || isSubdomainOf(parsed, applePodcastsHost)
  const host = isPodcast ? applePodcastsHost : 'music.apple.com'
  // `i` names the track inside an album or the episode inside a show, so where it is present
  // it is the thing being embedded. Either way the id is the numeric one a lookup takes.
  const trackId = parsed.searchParams.get('i')
  const id = trackId ?? pathId.replace(podcastIdPrefixRegex, '')
  const query = pickUrlParams(url, ['i'])

  return {
    provider: isPodcast ? 'applepodcasts' : 'applemusic',
    id: `${kind}/${id}`,
    src: `https://embed.${host}${parsed.pathname}${query}`,
    url: `https://${host}${parsed.pathname}${query}`,
    height: appleEmbedHeight,
  }
}

export const appleEmbedResolver = createIframeEmbedResolver(appleHosts, appleResolveEmbed)
