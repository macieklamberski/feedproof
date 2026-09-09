import { composeEmbedUrl } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { createIframe } from '../../utils/widgets.js'

// WP YouTube Lyte ships a facade whose id carries the video id and builds the iframe on click.
export const rebuildLyteEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('[id^="WYL_"], [id^="lyte_"]')) {
    // The inner lyte node arrives detached once its WYL wrapper has been replaced.
    if (!element.parentNode) {
      continue
    }

    const videoId = element.id.slice(element.id.indexOf('_') + 1)
    if (!videoId) {
      continue
    }

    const iframe = createIframe(document, composeEmbedUrl(videoId))
    element.replaceWith(iframe)
  }
}
