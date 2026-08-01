import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// Buzzsprout's WordPress shortcode ships an empty div plus a <script> whose src carries the
// podcast and episode ids, so a reader shows nothing at all: the script never runs and the
// div dies as an empty tag. Blog feeds carrying it have no enclosure for the episode either
// (verified across the corpus carriers), so this is the only route to the audio. The ids
// resolve to the file with no key (verified 2026-08-01, 206 audio/mpeg on a corpus id); any
// slug after the episode id is decorative. The show-level embed carries no episode id and is
// deliberately not matched, since there is nothing to resolve it to.
//
// Both observed script forms:
//   https://www.buzzsprout.com/{podcast}/{episode}.js?container_id=…
//   https://www.buzzsprout.com/{podcast}/episodes/{episode}-{slug}.js?container_id=…
const buzzsproutHost = 'buzzsprout.com'
const episodePathRegex = /^\/(\d+)\/(?:episodes\/)?(\d+)(?:-[^/]*)?\.js$/

const composeSourceUrl = (podcastId: string, episodeId: string): string => {
  return `https://www.buzzsprout.com/${podcastId}/${episodeId}.mp3`
}

export const buzzsproutMediaResolver: MediaResolver = {
  selector: 'script[src*="buzzsprout.com"]',
  extract: (element): MediaResolverResult | undefined => {
    // The selector guarantees a src containing the host substring, so only the host and
    // path checks can reject.
    const url = parseUrl(attr(element, 'src') ?? '', 'https://example.com')

    if (!url || (!isHostOf(url, buzzsproutHost) && !isSubdomainOf(url, buzzsproutHost))) {
      return
    }

    const match = url.pathname.match(episodePathRegex)
    const podcastId = match?.[1]
    const episodeId = match?.[2]

    if (!podcastId || !episodeId) {
      return
    }

    return { tag: 'audio', src: composeSourceUrl(podcastId, episodeId) }
  },
}
