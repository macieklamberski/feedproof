import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const legacyIdRegex = /^[0-9a-f]{8}$/i
const numericIdRegex = /^\d+$/

const simplecastHosts = ['simplecast.com']

// The one height every iframe states.
const playerHeight = 200

// Four generations, all naming the same episode: `player.simplecast.com/{uuid}` is current,
// `embed.simplecast.com/{8hex}` and `simplecast.com/e/{numeric}` are legacy, and
// `play.simplecast.com/{uuid}` is the share host. The legacy ids are a separate id space, so
// `isCurrent` says whether the id can be spoken to the player host directly.
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

// The player carries no metadata, and Simplecast's oEmbed wants the show-site episode page
// rather than the player url, so a title needs a lookup the enricher would have to do. What
// this resolver states offline is the provider, the episode and the height.
//
// A legacy url is left exactly as it stands. `embed.simplecast.com/{8hex}` does redirect to the
// player, but it redirects to a *different* id that the server assigns: `fc9a4d22` answers 301
// to `player.simplecast.com/06de288b-8b48-49a1-8de1-32cedc5a2ee9` (checked 2026-08-11). That
// mapping cannot be computed here, so speaking the legacy id to the player host would name an
// episode that does not exist. One redirect hop is the cost of not knowing the modern id.
//
// Status codes prove nothing on this host: `player.simplecast.com/{anything}` answers 200 with
// the same app shell, because the id is resolved by javascript. Only the legacy host validates,
// answering 404 for an unknown id.
export const simplecastResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const episode = extractSimplecastEpisode(url)

  if (!episode) {
    return
  }

  return {
    provider: 'simplecast',
    id: episode.id,
    src: episode.isCurrent ? `https://player.simplecast.com/${episode.id}` : url,
    height: playerHeight,
  }
}

export const simplecastEmbedResolver = createUrlEmbedResolver(
  simplecastHosts,
  simplecastResolveEmbed,
)

// No play request. The player speaks player.js and takes its `play`, flipping to its playing
// state, but loaded in Chrome by a click the audio never started from it. Nothing to send until
// it does.
