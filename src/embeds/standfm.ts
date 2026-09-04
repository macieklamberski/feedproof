import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const standfmHosts = ['stand.fm']

// Both kinds are named by a 24-character hex object id, and both take the same `embed/` prefix
// the page url lacks. The page itself answers `x-frame-options: SAMEORIGIN`, so a carrier
// framing it shows nothing and the prefix is what makes the embed real.
const safeIdRegex = /^[0-9a-f]{24}$/
const playerKinds = new Set(['episodes', 'channels'])

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
  const parsed = parseUrl(url, 'https://example.com')
  const segments = parsed ? getPathSegments(parsed) : []
  const [kind, id] = segments[0] === 'embed' ? segments.slice(1) : segments

  if (!kind || !playerKinds.has(kind) || !id || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'standfm',
    id: `${kind}/${id}`,
    src: `https://stand.fm/embed/${kind}/${id}`,
    url: `https://stand.fm/${kind}/${id}`,
    ...(kind === 'episodes' && { height: episodePlayerHeight }),
  }
}

export const standfmEmbedResolver = createUrlEmbedResolver(standfmHosts, standfmResolveEmbed)
