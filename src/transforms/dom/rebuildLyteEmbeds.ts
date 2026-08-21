import { composeEmbedUrl } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { createIframe } from '../../utils/widgets.js'

// WP YouTube Lyte renders a facade that carries the YouTube id in its id attribute
// (`WYL_{id}` on the outer wrapper, `lyte_{id}` on the inner node) and builds the real
// iframe with JS on click. A reader runs no JS, so the video never appears. Rebuild a
// plain <iframe> from the id so convertWidgets can placeholder it.
export const rebuildLyteEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('[id^="WYL_"], [id^="lyte_"]')) {
    // The outer WYL wrapper comes first in document order and is replaced whole,
    // taking the inner lyte node with it, so a later inner match has no parent.
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
