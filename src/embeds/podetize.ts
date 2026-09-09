import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[A-Za-z0-9_-]+$/

const podetizeHosts = ['player.podetize.com']

const playerHeight = 200

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

// Podetize's ShowCastR loader script mounts the player where it stands, and a reader strips it.
export const podetizeScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="player.podetize.com/loadShowcasePlayer.js"][data]',
  (element) => {
    const id = attr(element, 'data')

    if (!parseUrlOnHosts(attr(element, 'src'), podetizeHosts) || !id || !safeIdRegex.test(id)) {
      return
    }

    return composeEmbed(id, attr(element, 'epmode') === 'true')
  },
)

// The player.podetize.com iframe, carrying the episode id and mode as query parameters.
export const podetizeIframeEmbedResolver = createUrlEmbedResolver(
  podetizeHosts,
  podetizeResolveEmbed,
)
