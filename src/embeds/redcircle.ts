import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts, pickQueryParams, uuidRegex } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

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

// What the player's query is allowed to say: the light or dark rendering the publisher picked.
// That choice is made per embed, so the per-provider render hint has nowhere to hold it. It is
// also the only parameter publishers wrote: the three show loaders in the census spell it, and
// the 172 episode loaders carry no query at all.
const redcircleEmbedParams = ['theme']

export const redcircleResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, redcircleHosts)
  const subject = parsed ? readSubject(getPathSegments(parsed)) : undefined

  if (!parsed || !subject) {
    return
  }

  const params = new URLSearchParams(
    pickQueryParams(parsed.search, redcircleEmbedParams),
  ).toString()
  const query = params ? `?${params}` : ''

  if (subject.kind === 'show') {
    return {
      provider: 'redcircle',
      id: `show/${subject.show}`,
      src: `https://redcircle.com/embedded-show-webplayer/${subject.show}${query}`,
      url: `https://redcircle.com/shows/${subject.show}`,
      height: playerHeights.show,
    }
  }

  return {
    provider: 'redcircle',
    id: `episode/${subject.show}/${subject.episode}`,
    src: `https://redcircle.com/embedded-player/sh/${subject.show}/ep/${subject.episode}${query}`,
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
