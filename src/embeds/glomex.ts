import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// An integration id is a run of lowercase letters and digits, 15 to 17 characters in the wild.
// A playlist id is `v-` and twelve more, and the loader also accepts the word `auto`, so the
// same class covers both with the hyphen admitted.
const safeIdRegex = /^[a-z0-9-]{4,40}$/

const glomexHost = 'player.glomex.com'
const playerPathRegex = /^\/integration\/[^/]+\/(?:integration|iframe-player)\.html$/

// The url glomex's own loader builds from a `<glomex-player>` element (read 2026-09-06). The
// integration id alone selects a player whose playlist the integration chooses, which the loader
// spells `playlist-id="auto"`. The host answers the same 1,722-byte shell for any id, so no id
// can be checked by fetching it. The player fills whatever box it is given and the integration
// config defaults to 16:9, the shape of every hydrated specimen (640x360).
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
  const parsed = parseUrlOnHosts(url, glomexHost)

  if (!parsed || !playerPathRegex.test(parsed.pathname)) {
    return
  }

  const integrationId = parsed.searchParams.get('integrationId') ?? undefined
  const playlistId = parsed.searchParams.get('playlistId') ?? undefined

  return readEmbed(integrationId, playlistId)
}

export const glomexIframeEmbedResolver = createUrlEmbedResolver([glomexHost], glomexResolveEmbed)

export const glomexElementEmbedResolver = createMarkupEmbedResolver(
  'glomex-player[data-integration-id], glomex-integration[integration-id]',
  (element) => {
    if (element.localName === 'glomex-player') {
      return readEmbed(attr(element, 'data-integration-id'), attr(element, 'data-playlist-id'))
    }

    return readEmbed(attr(element, 'integration-id'), attr(element, 'playlist-id'))
  },
)
