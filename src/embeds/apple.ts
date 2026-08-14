import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Music and podcasts embed through the same player, served from `embed.music.apple.com` and
// `embed.podcasts.apple.com`, so both resolve here and only the provider name differs.
const appleHosts = ['music.apple.com', 'podcasts.apple.com']
const applePodcastsHost = 'podcasts.apple.com'

// The path is `/{storefront}/{kind}/{slug}/{id}`, with the storefront and the slug both
// optional. A music id is numeric, a playlist or station id carries a two-letter prefix
// (`pl.`, `ra.`) and a podcast id an `id` one.
const storefrontRegex = /^[a-z]{2}$/
const safeIdRegex = /^(?:id\d+|\d+|[a-z]{2}\.[a-z0-9-]+)$/i
const podcastIdPrefixRegex = /^id/

// The player is fluid-width and fixed-height, and one item gets a much shorter box than a
// collection. These are the heights the players render at, measured across widths; a music
// video is the one kind that keeps a 16:9 picture instead, so it has none. Apple's own embed
// code declares 150 for a song, which cuts 25px off the player it opens. They are a fallback
// for the shapes that ship no size at all: a height the markup declares is the publisher's
// choice and wins over these. The map doubles as the set of kinds that embed.
const appleHeights: Record<string, number | undefined> = {
  album: 450,
  artist: 450,
  playlist: 450,
  podcast: 450,
  station: 450,
  song: 175,
  'music-video': undefined,
}

export const appleResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed || (!isHostOf(parsed, appleHosts) && !isSubdomainOf(parsed, appleHosts))) {
    return
  }

  const segments = getPathSegments(parsed)
  const [kind, ...rest] = storefrontRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const pathId = rest[rest.length - 1]

  if (!kind || !pathId || !(kind in appleHeights) || !safeIdRegex.test(pathId)) {
    return
  }

  const isPodcast = isHostOf(parsed, applePodcastsHost) || isSubdomainOf(parsed, applePodcastsHost)
  const host = isPodcast ? applePodcastsHost : 'music.apple.com'
  // `i` names the track inside an album or the episode inside a show, so where it is present
  // it is the thing being embedded, and the player is the song one whatever the path says.
  // Either way the id is the numeric one a lookup takes.
  const trackId = parsed.searchParams.get('i')
  const id = trackId ?? pathId.replace(podcastIdPrefixRegex, '')
  const query = pickUrlParams(url, ['i'])

  return {
    provider: isPodcast ? 'applepodcasts' : 'applemusic',
    id: `${kind}/${id}`,
    src: `https://embed.${host}${parsed.pathname}${query}`,
    url: `https://${host}${parsed.pathname}${query}`,
    height: appleHeights[trackId ? 'song' : kind],
  }
}

export const appleEmbedResolver = createUrlEmbedResolver(appleHosts, appleResolveEmbed)
