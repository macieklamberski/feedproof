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
const safeIdRegex = /^(?:id\d+|\d+|[a-z]{2}\.[a-z0-9-]+)$/i
const podcastIdPrefixRegex = /^id/

// A track or episode id is always numeric. It comes off the query decoded and is written into
// the id, so anything else, a separator or a dot segment included, is refused.
const trackIdRegex = /^\d+$/

// The player is fluid-width, and one item gets a much shorter box than a collection. These are a
// fallback for the shapes that ship no size at all: a height the markup declares is the
// publisher's choice and wins over these. Apple's own embed code declares 150 for a song, which
// cuts 25px off the player it opens. A music video is the one kind that keeps a 16:9 picture
// instead, so it has none. The map doubles as the set of kinds that embed.
//
// None of these numbers is a height a player was seen to render. The five music heights are
// unmeasured: `embed.music.apple.com` sits at its grey placeholder with an empty `<main>`, at top
// level and inside a frame alike. Podcasts render, and what they render is a ratio: in Chrome on
// 2026-09-07 the show player at `podcast/the-daily/id1200361736` filled any frame it was given
// and floored at 180 at 320 wide, 360 at 640 and 422 at 1280, so 450 is a frame it fits rather
// than a height it asks for. The episode player, `?i=1000788126765`, floored at 160 at all three
// widths and filled 175 and 450 alike. Changing any of them needs a browser at two widths.
const appleHeights = toMap({
  album: 450,
  artist: 450,
  playlist: 450,
  podcast: 450,
  station: 450,
  song: 175,
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
  // `i` names the track inside an album or the episode inside a show, so where it is present
  // it is the thing being embedded, and the player is the song one whatever the path says.
  // Where it is absent the id is the path's own, which is numeric for music, `pl.`/`ra.`
  // prefixed for a playlist or station, and `id`-prefixed for a podcast.
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

// The unit of `duration` follows `isEpisode`: an episode states milliseconds and a show states
// seconds. Nothing in the payload says so, and the two differ by a factor no reader would
// question, so a show would otherwise be published as a runtime a thousand times too short.
const readDuration = (attributes: SubstackPodcastAttributes): number | undefined => {
  if (!attributes.duration) {
    return
  }

  return attributes.isEpisode ? Math.round(attributes.duration / 1000) : attributes.duration
}

// The component name is on the container while `data-attrs` sits on the iframe inside it, so the
// two are read from different elements. `targetUrl` is deliberately dropped: it is the same page
// this resolver already composes, with an affiliate token added.
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
    publisher: attributes.podcastTitle || undefined,
    author: attributes.podcastByline || undefined,
    thumbnail: attributes.imageUrl || undefined,
    date: attributes.releaseDate || undefined,
    duration: readDuration(attributes),
  }
}

export const appleEmbedResolver = createUrlEmbedResolver(appleHosts, (url, element) => {
  const result = appleResolveEmbed(url)

  return result && { ...result, ...readSubstackPodcast(element) }
})
