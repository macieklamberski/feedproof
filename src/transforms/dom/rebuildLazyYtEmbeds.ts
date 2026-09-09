import { composeEmbedUrl, isVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { attr, parsePixelSize } from '../../utils/dom.js'
import { createIframe, setDimensions } from '../../utils/widgets.js'

// data-youtube-id and data-youtube name the platform on their own. data-video_id, data-id and
// data-embed are not exclusive to anyone. The youtube-player pair is Lyte and Embed Plus.
const facadeSources: Array<{ selector: string; attribute: string }> = [
  { selector: 'div[data-youtube-id]', attribute: 'data-youtube-id' },
  { selector: 'div[data-youtube]', attribute: 'data-youtube' },
  { selector: 'div.youtube-embed[data-video_id]', attribute: 'data-video_id' },
  { selector: 'div.youtube-player[data-id]', attribute: 'data-id' },
  { selector: 'div.youtube-player[data-embed]', attribute: 'data-embed' },
]

// A YouTube facade div parks the video id in a data attribute and builds its iframe on click.
export const rebuildLazyYtEmbeds: DomTransform = () => (document) => {
  for (const { selector, attribute } of facadeSources) {
    for (const element of document.querySelectorAll(selector)) {
      const videoId = attr(element, attribute)

      if (!videoId || !isVideoId(videoId) || !element.parentNode) {
        continue
      }

      const iframe = createIframe(document, composeEmbedUrl(videoId))

      // The facades state 100% in data-width and data-height as often as a pixel count.
      setDimensions(iframe, {
        width: parsePixelSize(attr(element, 'data-width')),
        height: parsePixelSize(attr(element, 'data-height')),
      })

      element.replaceWith(iframe)
    }
  }
}
