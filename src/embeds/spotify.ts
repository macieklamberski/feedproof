import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The player is fluid-width and fixed-height, and the height depends on what sits inside it:
// the compact bar for a single item, the taller box for a collection. These are the heights
// Spotify's own oEmbed returns for each type. They are a fallback for the shapes that ship no
// size at all: a height the markup declares is the publisher's choice and wins over these.
// The map doubles as the set of types that embed.
const spotifyHeights: Record<string, number> = {
  track: 152,
  episode: 152,
  show: 152,
  album: 352,
  playlist: 352,
  artist: 352,
}

// Every type's id is 22 base62 characters.
const safeIdRegex = /^[a-zA-Z0-9]{22}$/
// `embed` opens a player path, `embed-podcast` its older podcast-only twin, `intl-{lang}` a
// localized page path. Whatever follows the id (`/video` on a video podcast) is decorative.
const pathPrefixRegex = /^(?:embed|embed-podcast|intl-[a-z]{2})$/
// The pre-2017 snippet framed `embed.spotify.com/?uri=spotify:{type}:{id}`, naming the track
// in a query parameter instead of the path. That host still serves a player, so these resolve
// to the modern URL rather than falling through to the generic iframe path.
const legacyUriRegex = /^spotify:([a-z]+):([a-zA-Z0-9]+)$/

const spotifyHost = 'spotify.com'

export const spotifyResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed || (!isHostOf(parsed, spotifyHost) && !isSubdomainOf(parsed, spotifyHost))) {
    return
  }

  const segments = getPathSegments(parsed)
  const [pathType, pathId] = pathPrefixRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const legacy = parsed.searchParams.get('uri')?.match(legacyUriRegex)
  const type = pathType ?? legacy?.[1]
  const id = pathId ?? legacy?.[2]

  if (!type || !id || !(type in spotifyHeights) || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'spotify',
    id: `${type}/${id}`,
    src: `https://open.spotify.com/embed/${type}/${id}`,
    url: `https://open.spotify.com/${type}/${id}`,
    height: spotifyHeights[type],
  }
}

export const spotifyEmbedResolver = createUrlEmbedResolver([spotifyHost], spotifyResolveEmbed)
