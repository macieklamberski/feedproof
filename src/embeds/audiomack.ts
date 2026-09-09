import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const audiomackHost = 'audiomack.com'

// A fixed height on a fluid width, which the kind sets. The embed opens behind a consent wall.
const audiomackHeights = toMap({
  album: 400,
  playlist: 400,
  song: 252,
})

// An artist handle and a slug, both of them lowercase words joined by hyphens or underscores.
const safeSlugRegex = /^[\w-]+$/

// The retired players 404 today, and the route word is the only place they record the kind.
const retiredRoutes = toMap({
  embed3: 'song',
  'embed3-album': 'album',
  embed4: 'song',
  'embed4-album': 'album',
  'embed4-large': 'song',
})

type Track = { artist: string; kind: string; slug: string; search: string }

const readTrack = (url: URL): Track | undefined => {
  const segments = getPathSegments(url)
  const [route, second, third, fourth] = segments

  // The retired players, `embed3/{artist}/{slug}` and its four siblings.
  const retired = retiredRoutes.get(route ?? '')

  if (retired && second && third) {
    return { artist: second, kind: retired, slug: third, search: '' }
  }

  if (route !== 'embed' || !second || !third || !fourth) {
    return
  }

  // The current player spells the kind either side of the artist: `embed/song/{artist}/{slug}`
  // 301s to `embed/{artist}/song/{slug}`.
  return audiomackHeights.has(second)
    ? { artist: third, kind: second, slug: fourth, search: url.search }
    : { artist: second, kind: third, slug: fourth, search: url.search }
}

export const audiomackResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, audiomackHost)
  const track = parsed && readTrack(parsed)

  if (!track || !audiomackHeights.has(track.kind)) {
    return
  }

  const { artist, kind, slug, search } = track

  if (!safeSlugRegex.test(artist) || !safeSlugRegex.test(slug)) {
    return
  }

  const path = `${artist}/${kind}/${slug}`

  return {
    provider: 'audiomack',
    // The whole path: the same artist and slug answer under song and under playlist alike.
    id: path,
    src: `https://audiomack.com/embed/${path}${search}`,
    url: `https://audiomack.com/${path}`,
    title: attr(element, 'title'),
    author: artist,
    height: audiomackHeights.get(kind),
  }
}

// Audiomack's player iframe, on the current embed route or a retired embed3 or embed4 one.
export const audiomackEmbedResolver = createUrlEmbedResolver([audiomackHost], audiomackResolveEmbed)
