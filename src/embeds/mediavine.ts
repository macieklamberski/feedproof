import { attr, parseRatio } from '../utils/dom.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

// Mediavine ships a video as an empty `<div class="mv-video-target mv-video-id-{id}"
// data-video-id="{id}">` that its script builds into a player, so a reader shows nothing at
// all. The embed player page is mintable from the id alone (verified live, 200). Mediavine
// has no public watch page, so the placeholder carries no `url`.
export const mediavineEmbedResolver = createMarkupEmbedResolver(
  'div.mv-video-target[data-video-id]',
  (element) => {
    const videoId = attr(element, 'data-video-id')

    if (!videoId) {
      return
    }

    // The div carries the player's aspect ratio as `data-ratio="{w}:{h}"`.
    const ratio = parseRatio(attr(element, 'data-ratio') ?? '')

    return {
      provider: 'mediavine',
      id: videoId,
      // The attribute is taken as written, so the id is encoded on the way into the path:
      // unescaped, `data-video-id="../../evil"` names a different page on the host and
      // `data-video-id="a?autoplay=1"` appends a query.
      src: `https://embed.mediavine.com/videos/${encodeURIComponent(videoId)}`,
      ...(ratio && { ratio }),
    }
  },
)
