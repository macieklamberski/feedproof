import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { videoFileRegex } from '../utils/urls.js'

// Discourse (3.2+) renders a video uploaded to a post as an empty div that only its web
// client turns into a player, so in a feed nothing renders. The div carries the upload's
// direct file URL and its thumbnail. Rebuild the native <video> with the thumbnail as
// poster. The markup never carries dimensions or an aspect ratio, so none are minted.
export const discourseMediaResolver: MediaResolver = {
  selector: '.video-placeholder-container[data-video-src]',
  extract: (element): MediaResolverResult | undefined => {
    const source = attr(element, 'data-video-src')

    if (!source || !videoFileRegex.test(source)) {
      return
    }

    const result: MediaResolverResult = { tag: 'video', src: source }
    const thumbnail = attr(element, 'data-thumbnail-src')

    if (thumbnail) {
      result.poster = thumbnail
    }

    return result
  },
}
