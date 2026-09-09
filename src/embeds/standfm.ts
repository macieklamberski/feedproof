import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const standfmHosts = ['stand.fm']

// Every player is named by a 24-character hex object id and takes the same `embed/` prefix the
// page url lacks. The page itself answers `x-frame-options: SAMEORIGIN`, so a carrier framing it
// shows nothing and the prefix is what makes the embed real. The kind is matched on its shape
// rather than against a list of the two stand.fm publishes today: a kind added later is
// unframeable in its page form like every other, while a first segment that names no player at
// all costs a 404 the page url answered anyway (probed 2026-09-07).
const safeIdRegex = /^[0-9a-f]{24}$/
const playerKindRegex = /^[a-z]+$/

// The episode card is fluid-width and fixed-height: 165 tall from 480 to 660 wide, growing past
// 200 only below 400, measured 2026-09-04 on two episodes. stand.fm's own snippet sizes the
// iframe with a `<style>` beside it, 190 on a desktop and 230 on a phone, which is stripped
// before the iframe reaches a reader, so its desktop number is restated here. A channel embed
// is a scrolling list of episodes with no height of its own, so it states none.
const episodePlayerHeight = 190

// A single episode and a whole channel are different players and different sizes, so the kind is
// carried into the id. Both discriminate, which is what makes them worth minting: a real id
// answers 200 and a fabricated one answers 404, and neither sends `x-frame-options` (probed
// 2026-08-16).
export const standfmResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, placeholderBaseUrl)
  const segments = parsed ? getPathSegments(parsed) : []
  const [kind, id] = segments[0] === 'embed' ? segments.slice(1) : segments

  if (!kind || !playerKindRegex.test(kind) || !id || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'standfm',
    id: `${kind}/${id}`,
    src: `https://stand.fm/embed/${kind}/${id}`,
    url: `https://stand.fm/${kind}/${id}`,
    // Gated on the kind, not on the value, so this stays a spread and not a trimObject field.
    ...(kind === 'episodes' && { height: episodePlayerHeight }),
  }
}

export const standfmEmbedResolver = createUrlEmbedResolver(standfmHosts, standfmResolveEmbed)
