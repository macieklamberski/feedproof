import { composeEmbedUrl, isVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { attr, parsePixelSize } from '../../utils/dom.js'

// Each facade parks the id in its own attribute and builds the iframe with JS on click, so a
// reader shows nothing at all. Measured across the corpus: `.youtube-embed[data-video_id]` is
// the largest at 701 feeds, `data-youtube-id` follows at roughly 212, `data-youtube` at 120,
// and `.lazyYT` (the jQuery plugin this transform started with) at 155.
//
// `data-youtube-id` and `data-youtube` are matched on the attribute alone because the name says
// the platform. `data-video_id` is not exclusive to anyone, so it is matched only beside the
// `youtube-embed` class that names one. Either way the value has to pass `isVideoId`, so what
// counts as a video id stays a single answer in `embeds/youtube.ts`.
const facadeSources: Array<{ selector: string; attribute: string }> = [
  { selector: 'div.lazyYT[data-youtube-id]', attribute: 'data-youtube-id' },
  { selector: 'div[data-youtube-id]', attribute: 'data-youtube-id' },
  { selector: 'div[data-youtube]', attribute: 'data-youtube' },
  { selector: 'div.youtube-embed[data-video_id]', attribute: 'data-video_id' },
]

export const rebuildLazyYtEmbeds: DomTransform = () => (document) => {
  for (const { selector, attribute } of facadeSources) {
    for (const element of document.querySelectorAll(selector)) {
      const videoId = attr(element, attribute)

      // A facade already rebuilt by an earlier entry has been replaced, so it no longer has a
      // parent to swap out.
      if (!videoId || !isVideoId(videoId) || !element.parentNode) {
        continue
      }

      const iframe = document.createElement('iframe')
      iframe.setAttribute('src', composeEmbedUrl(videoId))

      // Carry the facade's pixel size so the placeholder downstream can reserve the right space.
      // Parsed rather than copied: these facades state `100%` as often as a pixel count, and
      // that is not a value the width attribute can hold.
      const width = parsePixelSize(attr(element, 'data-width'))
      const height = parsePixelSize(attr(element, 'data-height'))

      if (width) {
        iframe.setAttribute('width', String(width))
      }

      if (height) {
        iframe.setAttribute('height', String(height))
      }

      element.replaceWith(iframe)
    }
  }
}
