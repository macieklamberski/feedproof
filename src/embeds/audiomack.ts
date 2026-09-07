import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const audiomackHost = 'audiomack.com'

// A fixed height on a fluid width, and the kind is what sets it. Both numbers are what the
// corpus's own frames state, unanimously: 287 of the 287 song frames say 252 and 52 of the 57
// album and playlist frames say 400, against a width that is `100%` on 343 of 379. The player
// itself could not be measured in a browser, because the embed opens behind a consent wall.
const audiomackHeights: Record<string, number> = {
  album: 400,
  playlist: 400,
  song: 252,
}

// An artist handle and a slug, both of them lowercase words joined by hyphens or underscores.
const safeSlugRegex = /^[\w-]+$/

// The retired players, each naming an artist and a slug and nothing else. They 404 today:
// `embed3/hhs1987/pound-cake-freestyle-2` and `embed3-album/chuuwee/cool-world` both answer 404
// while `embed/chuuwee/album/cool-world` serves that same album. So the route word is the only
// place the kind is recorded, and it is what this map recovers.
const retiredRoutes: Record<string, string> = {
  embed3: 'song',
  'embed3-album': 'album',
  embed4: 'song',
  'embed4-album': 'album',
  'embed4-large': 'song',
}

type Track = { artist: string; kind: string; slug: string; search: string }

const readTrack = (url: URL): Track | undefined => {
  const segments = getPathSegments(url)
  const [route, second, third, fourth] = segments

  // The retired players, `embed3/{artist}/{slug}` and its four siblings.
  const retired = retiredRoutes[route ?? '']

  if (retired && second && third) {
    return { artist: second, kind: retired, slug: third, search: '' }
  }

  if (route !== 'embed' || !second || !third || !fourth) {
    return
  }

  // The current player spells the kind either side of the artist. `embed/song/{artist}/{slug}`
  // 301s to `embed/{artist}/song/{slug}`, so the second is canonical and the first is written
  // out to it rather than passed on.
  return second in audiomackHeights
    ? { artist: third, kind: second, slug: fourth, search: url.search }
    : { artist: second, kind: third, slug: fourth, search: url.search }
}

export const audiomackResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, audiomackHost)
  const track = parsed && readTrack(parsed)

  if (!track || !(track.kind in audiomackHeights)) {
    return
  }

  const { artist, kind, slug, search } = track

  if (!safeSlugRegex.test(artist) || !safeSlugRegex.test(slug)) {
    return
  }

  const path = `${artist}/${kind}/${slug}`

  return {
    provider: 'audiomack',
    // The whole path, because the artist and the slug only name a recording together and the
    // kind decides which of them: `larrynorman/song/burn-2` and `larrynorman/playlist/burn-2`
    // are different addresses that both answer.
    id: path,
    src: `https://audiomack.com/embed/${path}${search}`,
    url: `https://audiomack.com/${path}`,
    height: audiomackHeights[kind],
  }
}

export const audiomackEmbedResolver = createUrlEmbedResolver([audiomackHost], audiomackResolveEmbed)
