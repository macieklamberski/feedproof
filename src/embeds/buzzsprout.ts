import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Buzzsprout embeds a player two ways: a WordPress shortcode shipping an empty div plus a
// <script> whose src carries the ids, and a direct player iframe. Both name the same player, so
// both resolve to the same placeholder. The script never runs in a reader and its div dies as an
// empty tag, so without resolving it the player vanishes; blog feeds carrying the shortcode have
// no enclosure for the episode either (verified across the corpus carriers). The slug-less player
// URL resolves with no key (verified 2026-08-08, 200 on a live episode); any slug after the
// episode id is decorative.
//
// A script naming the podcast alone is the show player, which carries every episode. The
// url-keyed resolver deliberately leaves the show-level *page* url unmatched: there it falls
// through to the generic fallback, which still renders a placeholder. The script carrier has no
// such fallback, so the same shape costs the whole player.
const buzzsproutHost = 'buzzsprout.com'
const episodeScriptPathRegex = /^\/(\d+)\/(?:episodes\/)?(\d+)(?:-[^/]*)?\.js$/
const showScriptPathRegex = /^\/(\d+)\.js$/
const episodePagePathRegex = /^\/(\d+)\/(?:episodes\/)?(\d+)(?:-[^/]*)?$/

// Both heights are what Buzzsprout's own script writes onto the iframe it builds: 200 for the
// small episode player, 375 for the large show player (read from the served script, 2026-08-15).
const episodeHeight = 200
const showHeight = 375

const composeEmbed = (podcastId: string, episodeId?: string): EmbedResolverResult => {
  const path = episodeId ? `${podcastId}/${episodeId}` : podcastId

  return {
    provider: 'buzzsprout',
    id: path,
    src: `https://www.buzzsprout.com/${path}?iframe=true`,
    url: `https://www.buzzsprout.com/${path}`,
    height: episodeId ? episodeHeight : showHeight,
  }
}

export const buzzsproutResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, buzzsproutHost)

  if (!parsed) {
    return
  }

  const match = parsed.pathname.match(episodePagePathRegex)
  const podcastId = match?.[1]
  const episodeId = match?.[2]

  if (!podcastId || !episodeId) {
    return
  }

  return composeEmbed(podcastId, episodeId)
}

export const buzzsproutIframeEmbedResolver: EmbedResolver = createUrlEmbedResolver(
  [buzzsproutHost],
  buzzsproutResolveEmbed,
)

export const buzzsproutScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="buzzsprout.com"]',
  (element) => {
    // The selector guarantees a src containing the host substring, so only the host and
    // path checks can reject.
    const url = parseUrlOnHosts(attr(element, 'src'), buzzsproutHost)

    if (!url) {
      return
    }

    const episode = url.pathname.match(episodeScriptPathRegex)

    if (episode?.[1] && episode[2]) {
      return composeEmbed(episode[1], episode[2])
    }

    const show = url.pathname.match(showScriptPathRegex)

    if (show?.[1]) {
      return composeEmbed(show[1])
    }
  },
)
