import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The loader is served from `api.podcache.net` and the player it builds from `redcircle.com`, on
// the same path, so one reader covers both.
const redcircleHosts = ['redcircle.com', 'api.podcache.net']

// Fluid in width and fixed in height, both taken from what the loader scripts set on the iframe
// they build: 170 for an episode, and `height: 100%` under a `min-height: 320px` for a show,
// which collapses to the minimum inside the `height: auto` mount the snippet ships.
const playerHeights = { episode: 170, show: 320 }

// The show player's own page is `embedded-show-webplayer`, not the `embedded-show-player` the
// loader is fetched from: checked live 2026-09-06, the loader path answers a Next.js 404 on
// redcircle.com while the webplayer path renders the playlist.
const routes = {
  'embedded-player': 'episode',
  'embedded-show-player': 'show',
  'embedded-show-webplayer': 'show',
} as const

// The episode player takes both ids: RedCircle addresses an episode under its show, so neither
// uuid on its own rebuilds the endpoint.
const readSubject = (
  segments: Array<string>,
): { kind: 'episode' | 'show'; show: string; episode?: string } | undefined => {
  const [route, ...rest] = segments
  const kind = route ? routes[route as keyof typeof routes] : undefined

  if (!kind) {
    return
  }

  // Only the webplayer spells the show id bare; the two loader paths put `sh` in front of it.
  const show = route === 'embedded-show-webplayer' ? rest[0] : rest[1]

  if (!show || !uuidRegex.test(show) || (route !== 'embedded-show-webplayer' && rest[0] !== 'sh')) {
    return
  }

  if (kind === 'show') {
    return { kind, show }
  }

  const episode = rest[2] === 'ep' ? rest[3] : undefined

  if (!episode || !uuidRegex.test(episode)) {
    return
  }

  return { kind, show, episode }
}

// The query is kept because it is where the publisher's `theme=` lives.
export const redcircleResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, redcircleHosts)
  const subject = parsed ? readSubject(getPathSegments(parsed)) : undefined

  if (!parsed || !subject) {
    return
  }

  if (subject.kind === 'show') {
    return {
      provider: 'redcircle',
      id: `show/${subject.show}`,
      src: `https://redcircle.com/embedded-show-webplayer/${subject.show}${parsed.search}`,
      url: `https://redcircle.com/shows/${subject.show}`,
      height: playerHeights.show,
    }
  }

  return {
    provider: 'redcircle',
    id: `episode/${subject.show}/${subject.episode}`,
    src: `https://redcircle.com/embedded-player/sh/${subject.show}/ep/${subject.episode}${parsed.search}`,
    url: `https://redcircle.com/shows/${subject.show}/episodes/${subject.episode}`,
    height: playerHeights.episode,
  }
}

// RedCircle's embed code is a loader script on `api.podcache.net` beside an empty
// `div.redcirclePlayer-{episode}` mount. The script is stripped and the mount is an empty div, so
// nothing of the player survives. The loader's own path names the show and the episode, and the
// iframe it would have built is that path on `redcircle.com`, which renders the player for a
// real episode and a blank page for an invented one (Chrome, 2026-09-06).
export const redcircleScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="podcache.net/embedded-"]',
  (element) => {
    return redcircleResolveEmbed(attr(element, 'src') ?? '')
  },
)

export const redcircleIframeEmbedResolver = createUrlEmbedResolver(
  redcircleHosts,
  redcircleResolveEmbed,
)
