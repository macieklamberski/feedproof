import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { composeQuery, parseUrlOnHosts, pickQueryParams, uuidRegex } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const redcircleHosts = ['redcircle.com', 'api.podcache.net']

const playerHeights = { episode: 170, show: 320 }

// `embedded-show-webplayer` is the show player's real page: `embedded-show-player` answers 404.
const routes = {
  'embedded-player': 'episode',
  'embedded-show-player': 'show',
  'embedded-show-webplayer': 'show',
} as const

const readSubject = (
  segments: Array<string>,
): { kind: 'episode' | 'show'; show: string; episode?: string } | undefined => {
  const [route, ...rest] = segments
  const kind = route ? routes[route as keyof typeof routes] : undefined

  if (!kind) {
    return
  }

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

const redcircleEmbedParams = ['theme']

export const redcircleResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, redcircleHosts)
  const subject = parsed ? readSubject(getPathSegments(parsed)) : undefined

  if (!parsed || !subject) {
    return
  }

  const query = composeQuery(pickQueryParams(parsed.search, redcircleEmbedParams))

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

// RedCircle's embed code: a loader script on api.podcache.net beside an empty div only it fills.
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
