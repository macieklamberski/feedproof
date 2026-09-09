import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const audiomackHost = 'audiomack.com'

const audiomackHeights = toMap({
  album: 400,
  playlist: 400,
  song: 252,
})

const safeSlugRegex = /^[\w-]+$/

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

  const retired = retiredRoutes.get(route ?? '')

  if (retired && second && third) {
    return { artist: second, kind: retired, slug: third, search: '' }
  }

  if (route !== 'embed' || !second || !third || !fourth) {
    return
  }

  return audiomackHeights.has(second)
    ? { artist: third, kind: second, slug: fourth, search: url.search }
    : { artist: second, kind: third, slug: fourth, search: url.search }
}

export const audiomackResolveEmbed = (url: string): EmbedResolverResult | undefined => {
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
    id: path,
    src: `https://audiomack.com/embed/${path}${search}`,
    url: `https://audiomack.com/${path}`,
    height: audiomackHeights.get(kind),
  }
}

// Audiomack's player iframe, on the current embed route or a retired embed3 or embed4 one.
export const audiomackEmbedResolver = createUrlEmbedResolver([audiomackHost], audiomackResolveEmbed)
