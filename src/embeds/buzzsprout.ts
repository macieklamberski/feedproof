import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Buzzsprout embeds a podcast episode player two ways: a WordPress shortcode shipping an
// empty div plus a <script> whose src carries the podcast and episode ids, and a direct
// player iframe. Both name the same player, so both resolve to the same placeholder. The
// script never runs in a reader and its div dies as an empty tag, so without resolving it
// the episode vanishes; blog feeds carrying the shortcode have no enclosure for the episode
// either (verified across the corpus carriers). The slug-less player URL resolves with no
// key (verified 2026-08-08, 200 on a live episode); any slug after the episode id is
// decorative. The show-level embed carries no episode id and is deliberately not matched.
//
// Both observed script forms:
//   https://www.buzzsprout.com/{podcast}/{episode}.js?container_id=…
//   https://www.buzzsprout.com/{podcast}/episodes/{episode}-{slug}.js?container_id=…
const buzzsproutHost = 'buzzsprout.com'
const episodeScriptPathRegex = /^\/(\d+)\/(?:episodes\/)?(\d+)(?:-[^/]*)?\.js$/
const episodePagePathRegex = /^\/(\d+)\/(?:episodes\/)?(\d+)(?:-[^/]*)?$/

const composeEmbed = (podcastId: string, episodeId: string): EmbedResolverResult => {
  return {
    provider: 'buzzsprout',
    id: `${podcastId}/${episodeId}`,
    src: `https://www.buzzsprout.com/${podcastId}/${episodeId}?iframe=true`,
    url: `https://www.buzzsprout.com/${podcastId}/${episodeId}`,
    height: 200,
  }
}

export const buzzsproutResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, 'https://example.com')

  if (!parsed || (!isHostOf(parsed, buzzsproutHost) && !isSubdomainOf(parsed, buzzsproutHost))) {
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
    const url = parseUrl(attr(element, 'src') ?? '', 'https://example.com')

    if (!url || (!isHostOf(url, buzzsproutHost) && !isSubdomainOf(url, buzzsproutHost))) {
      return
    }

    const match = url.pathname.match(episodeScriptPathRegex)
    const podcastId = match?.[1]
    const episodeId = match?.[2]

    if (!podcastId || !episodeId) {
      return
    }

    return composeEmbed(podcastId, episodeId)
  },
)
