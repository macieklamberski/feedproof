import { composeEmbedUrl, isVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'
import { createIframe } from '../../utils/widgets.js'

// WP Rocket swaps a YouTube iframe for a preview div that rebuilds it with JS on click.
export const rebuildRocketYoutubePreviews: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('div.rll-youtube-player')) {
    // The div states the video twice, as the embed url in data-src and as the id in data-id.
    // One shape ships only the id.
    const videoId = attr(element, 'data-id')
    const src =
      attr(element, 'data-src') ??
      (videoId && isVideoId(videoId) ? composeEmbedUrl(videoId) : undefined)

    if (!src) {
      continue
    }

    const query = attr(element, 'data-query')
    const iframe = createIframe(document, query ? `${src}?${query}` : src)

    element.replaceWith(iframe)
  }
}
