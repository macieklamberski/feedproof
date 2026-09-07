import { composeEmbedUrl, isVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'
import { createIframe } from '../../utils/widgets.js'

// WP Rocket's "Replace YouTube iframe with preview image" rewrites the real iframe into a
// `.rll-youtube-player` preview div and only builds the iframe with JS on click, so a reader
// (which runs no JS) never shows the video. Promote it back to a real <iframe>. The YouTube
// resolver downstream recovers the id and thumbnail.
//
// The div states the video twice, as the ready embed url in `data-src` and as the bare id in
// `data-id`, and one shape ships only the id: 2 of the 9 feeds carrying the facade across
// 5,507,897 corpus feeds. The div holds nothing, so a shape left unmatched is not an empty box
// on the page: `stripEmptyTags` removes it and the video is gone from the item entirely.
export const rebuildRocketYoutubePreviews: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('div.rll-youtube-player')) {
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
