import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[A-Za-z0-9_-]+$/

const podetizeHosts = ['player.podetize.com']

// Fluid in width and fixed in height: every iframe the corpus carries states 200, which is
// what Podetize's own snippet writes. The player card itself measured 218 tall at 520 wide in
// Chrome (2026-09-06), so the snippet clips it slightly and is kept all the same.
const playerHeight = 200

// The player answers 200 for any id and asks `feeds.podetize.com/ep/{id}/playerparams` for the
// episode, which is where the id space shows: a real episode returns its params and an invented
// or deleted one an empty body or a 404 (2026-09-06).
const composeEmbed = (id: string, isEpisodeMode: boolean): EmbedResolverResult => {
  const query = new URLSearchParams({ id })

  if (isEpisodeMode) {
    query.set('epmode', 'true')
  }

  return {
    provider: 'podetize',
    id,
    src: `https://player.podetize.com/?${query}`,
    height: playerHeight,
  }
}

export const podetizeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, podetizeHosts)
  const id = parsed?.searchParams.get('id')

  if (parsed?.pathname !== '/' || !id || !safeIdRegex.test(id)) {
    return
  }

  return composeEmbed(id, parsed.searchParams.get('epmode') === 'true')
}

// Podetize's ShowCastR snippet is a loader script carrying the episode in a bare `data`
// attribute and the player mode in `epmode`, and it mounts the player where it stands. The
// script is stripped, so the reader gets nothing. The iframe form takes the same two values as
// query parameters.
export const podetizeScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="player.podetize.com/loadShowcasePlayer.js"][data]',
  (element) => {
    const id = attr(element, 'data')

    if (!id || !safeIdRegex.test(id)) {
      return
    }

    return composeEmbed(id, attr(element, 'epmode') === 'true')
  },
)

export const podetizeIframeEmbedResolver = createUrlEmbedResolver(
  podetizeHosts,
  podetizeResolveEmbed,
)
