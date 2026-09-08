import { composeEmbedUrl, isVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { attr, parsePixelSize } from '../../utils/dom.js'
import { createIframe, setDimensions } from '../../utils/widgets.js'

// Each facade parks the id in its own attribute and builds the iframe with JS on click, so a
// reader shows nothing at all. Measured across the corpus: `.youtube-embed[data-video_id]` is
// the largest at 701 feeds, `data-youtube-id` follows at roughly 212, `data-youtube` at 120,
// and the `.lazyYT` jQuery plugin at 155.
//
// `data-youtube-id` and `data-youtube` are matched on the attribute alone because the name says
// the platform. `data-video_id`, `data-id` and `data-embed` are not exclusive to anyone, so each
// is matched only beside the class that names one. Either way the value has to pass `isVideoId`,
// so what counts as a video id stays a single answer in `embeds/youtube.ts`.
//
// The `youtube-player` pair is the Lyte and Embed Plus family, 147 feeds. Its div holds nothing,
// so leaving it unmatched is not an empty box on the page: `stripEmptyTags` removes it and the
// video is gone from the item entirely.
const facadeSources: Array<{ selector: string; attribute: string }> = [
  { selector: 'div[data-youtube-id]', attribute: 'data-youtube-id' },
  { selector: 'div[data-youtube]', attribute: 'data-youtube' },
  { selector: 'div.youtube-embed[data-video_id]', attribute: 'data-video_id' },
  { selector: 'div.youtube-player[data-id]', attribute: 'data-id' },
  { selector: 'div.youtube-player[data-embed]', attribute: 'data-embed' },
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

      const iframe = createIframe(document, composeEmbedUrl(videoId))

      // Carry the facade's pixel size so the placeholder downstream can reserve the right space.
      // Parsed rather than copied: these facades state `100%` as often as a pixel count, and
      // that is not a value the width attribute can hold.
      setDimensions(iframe, {
        width: parsePixelSize(attr(element, 'data-width')),
        height: parsePixelSize(attr(element, 'data-height')),
      })

      element.replaceWith(iframe)
    }
  }
}
