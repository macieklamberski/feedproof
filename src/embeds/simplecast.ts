import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { uuidRegex } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `embed.simplecast.com/{8hex}` and `simplecast.com/e/{numeric}` are legacy spellings of the
// episode, and `play.simplecast.com/{uuid}` is the share host.
const legacyIdRegex = /^[0-9a-f]{8}$/i
const numericIdRegex = /^\d+$/

const simplecastHosts = ['simplecast.com']

// The one height every iframe states.
const playerHeight = 200

export const extractSimplecastEpisode = (
  link: string,
): { id: string; isCurrent: boolean } | undefined => {
  const segments = getPathSegments(link)
  const id = segments[0] === 'e' ? segments[1] : segments[0]

  if (!id) {
    return
  }

  if (uuidRegex.test(id)) {
    return { id, isCurrent: true }
  }

  if (legacyIdRegex.test(id) || numericIdRegex.test(id)) {
    return { id, isCurrent: false }
  }
}

export const simplecastResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const episode = extractSimplecastEpisode(url)

  if (!episode) {
    return
  }

  return {
    provider: 'simplecast',
    id: episode.id,
    // Minting a legacy id onto the player host names no episode: the redirect assigns a new uuid.
    // `player.simplecast.com/{anything}` answers 200 with the same app shell, since the id is
    // resolved by javascript. Only the legacy host validates, answering 404 for an unknown id.
    src: episode.isCurrent ? `https://player.simplecast.com/${episode.id}` : url,
    height: playerHeight,
  }
}

// Simplecast's player iframe, player.simplecast.com/{uuid}, and its three legacy spellings.
export const simplecastEmbedResolver = createUrlEmbedResolver(
  simplecastHosts,
  simplecastResolveEmbed,
)
