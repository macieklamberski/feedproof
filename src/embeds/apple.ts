import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { jsonAttr, keepIfMatches } from '../utils/dom.js'
import { isOnHosts, parseUrlOnHosts, pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Music and podcasts embed through the same player, served from `embed.music.apple.com` and
// `embed.podcasts.apple.com`, so both resolve here and only the provider name differs.
const appleHosts = ['music.apple.com', 'podcasts.apple.com']
const applePodcastsHosts = ['podcasts.apple.com']

// The path is `/{storefront}/{kind}/{slug}/{id}`, with the storefront and the slug both
// optional. A music id is numeric, a playlist or station id carries a two-letter prefix
// (`pl.`, `ra.`) and a podcast id an `id` one.
const storefrontRegex = /^[a-z]{2}$/
// A numeric music id, a two-letter prefixed playlist or station id, or an `id`-prefixed podcast id.
const safeIdRegex = /^(?:id\d+|\d+|[a-z]{2}\.[a-z0-9-]+)$/i
const podcastIdPrefixRegex = /^id/

// A track or episode id is always numeric. It comes off the query decoded and is written into
// the id, so anything else, a separator or a dot segment included, is refused.
// `i` names the track in an album or the episode in a show, and its player is the song one.
const trackIdRegex = /^\d+$/

// The player is fluid-width. The podcast show player fills any frame and floors at 180 at 320
// wide, 360 at 640 and 422 at 1280, and the episode player floors at 160 at every width.
const appleHeights = toMap({
  album: 450,
  artist: 450,
  playlist: 450,
  podcast: 450,
  station: 450,
  // Apple's own snippet declares 150 for a song, which cuts 25px off the player it opens.
  song: 175,
  // Kept with no height: a music video is 16:9, and the map doubles as the set of kinds that
  // embed.
  'music-video': undefined,
})

export const appleResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, appleHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const [kind, ...rest] = storefrontRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const pathId = rest[rest.length - 1]

  if (!kind || !pathId || !appleHeights.has(kind) || !safeIdRegex.test(pathId)) {
    return
  }

  const isPodcast = isOnHosts(parsed, applePodcastsHosts)
  const host = isPodcast ? 'podcasts.apple.com' : 'music.apple.com'
  const trackId = keepIfMatches(parsed.searchParams.get('i'), trackIdRegex)
  const id = trackId ?? pathId.replace(podcastIdPrefixRegex, '')
  // A refused `i` is dropped from the player url as well: the resolver does not forward a value
  // it would not put in the id, and the collection player is what the path names without it.
  const query = trackId ? pickUrlParams(url, ['i']) : ''

  return {
    provider: isPodcast ? 'applepodcasts' : 'applemusic',
    id: `${kind}/${id}`,
    src: `https://embed.${host}${parsed.pathname}${query}`,
    url: `https://${host}${parsed.pathname}${query}`,
    height: appleHeights.get(trackId ? 'song' : kind),
  }
}

// Substack renders an Apple podcast as an iframe inside its own container, and the whole card
// travels with it as JSON: the episode and show titles, the artwork, the byline, the runtime and
// the release date. None of it survives the generic path and none of it needs a network call.
type SubstackPodcastAttributes = {
  isEpisode?: boolean
  imageUrl?: string
  title?: string
  podcastTitle?: string
  podcastByline?: string
  duration?: number
  releaseDate?: string
}

// An episode's `duration` is milliseconds and a show's is seconds.
// Nothing in the payload says so.
const readDuration = (attributes: SubstackPodcastAttributes): number | undefined => {
  if (!attributes.duration) {
    return
  }

  return attributes.isEpisode ? Math.round(attributes.duration / 1000) : attributes.duration
}

// The component name is on the container while `data-attrs` sits on the iframe inside it. The
// payload's `targetUrl` is the same page this resolver composes, with an affiliate token added.
const readSubstackPodcast = (element: Element): Partial<EmbedResolverResult> => {
  if (!element.closest('[data-component-name="ApplePodcastToDom"]')) {
    return {}
  }

  const attributes = jsonAttr<SubstackPodcastAttributes>(element, 'data-attrs')

  if (!attributes) {
    return {}
  }

  return {
    title: attributes.title || undefined,
    // A show card states the show's own title here, so only an episode has a publication to name.
    // Apple's episode page reads `Podcast Episode · Undertone` while its show page reads a genre
    // and a cadence, `Design Podcast · Updated Weekly`, and never a publisher.
    publisher: (attributes.isEpisode && attributes.podcastTitle) || undefined,
    // Apple names the byline `artistName` on a show and on an episode alike, and it holds a
    // person, a network or both ("Evan Epstein", "The New York Times", "Guy Raz | Wondery"),
    // so it cannot answer who publishes.
    author: attributes.podcastByline || undefined,
    thumbnail: attributes.imageUrl || undefined,
    date: attributes.releaseDate || undefined,
    duration: readDuration(attributes),
  }
}

// Apple's music and podcast player iframe. Substack wraps it in a card carrying JSON metadata.
export const appleEmbedResolver = createUrlEmbedResolver(appleHosts, (url, element) => {
  const result = appleResolveEmbed(url)

  return result && { ...result, ...readSubstackPodcast(element) }
})
