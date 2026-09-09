import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[a-z0-9-]+$/

const glomexHosts = ['player.glomex.com']
const playerPathRegex = /^\/integration\/[^/]+\/(?:integration|iframe-player)\.html$/

const composeEmbed = (integrationId: string, playlistId?: string): EmbedResolverResult => {
  const query = new URLSearchParams({ integrationId })

  if (playlistId) {
    query.set('playlistId', playlistId)
  }

  return {
    provider: 'glomex',
    id: playlistId ? `${integrationId}/${playlistId}` : integrationId,
    src: `https://player.glomex.com/integration/1/integration.html?${query}`,
    ratio: '16/9',
  }
}

const readEmbed = (
  integrationId: string | undefined,
  playlistId: string | undefined,
): EmbedResolverResult | undefined => {
  const safeIntegrationId = keepIfMatches(integrationId, safeIdRegex)

  if (!safeIntegrationId) {
    return
  }

  return composeEmbed(safeIntegrationId, keepIfMatches(playlistId, safeIdRegex))
}

export const glomexResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, glomexHosts)

  if (!parsed || !playerPathRegex.test(parsed.pathname)) {
    return
  }

  const integrationId = parsed.searchParams.get('integrationId') ?? undefined
  const playlistId = parsed.searchParams.get('playlistId') ?? undefined

  return readEmbed(integrationId, playlistId)
}

export const glomexIframeEmbedResolver = createUrlEmbedResolver(glomexHosts, glomexResolveEmbed)

// The `<glomex-player>` custom element, which only glomex's loader script turns into a player.
export const glomexElementEmbedResolver = createMarkupEmbedResolver(
  'glomex-player[data-integration-id], glomex-integration[integration-id]',
  (element) => {
    if (element.localName === 'glomex-player') {
      return readEmbed(attr(element, 'data-integration-id'), attr(element, 'data-playlist-id'))
    }

    return readEmbed(attr(element, 'integration-id'), attr(element, 'playlist-id'))
  },
)
