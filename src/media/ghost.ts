import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr, getElementDimensions } from '../utils/dom.js'
import * as styles from '../utils/styles.js'

// Ghost's video and audio cards carry a real media element pointing at the author's upload,
// but in feeds from Ghost versions before its own June 2026 RSS cleanup the element ships
// without `controls` (so it renders unplayable), the video's `poster` is a transparent
// spacer gif (the real thumbnail sits in `data-kg-thumbnail`/`data-kg-custom-thumbnail` on
// the figure), and the card's scripted player chrome survives as junk. Resolving the inner
// element into a fresh native one drops the chrome wholesale. The video selector matches
// the chrome container, not the figure, so the author's figcaption beside it survives. The
// audio card is matched whole and its one piece of content, the track title, is carried over.
// Cleaned feeds carry no `.kg-video-container`, so their video cards are left alone.
export const ghostMediaResolver: MediaResolver = {
  kind: 'media',
  selector: '.kg-video-card .kg-video-container, .kg-audio-card',
  extract: (element): MediaResolverResult | undefined => {
    if (element.classList.contains('kg-video-container')) {
      const video = element.querySelector('video[src]')
      const source = attr(video, 'src')

      if (!video || !source) {
        return
      }

      // The element's own poster is the transparent spacer, so it is never read. The figure's
      // thumbnail attributes carry the real one, the custom thumbnail first since it is the
      // author's own choice over the frame Ghost picked. Cards from before those attributes
      // existed state the thumbnail as the video's own background instead, which is the only
      // place it is written on them.
      const figure = element.closest('.kg-video-card')
      const thumbnail =
        attr(figure, 'data-kg-custom-thumbnail') ??
        attr(figure, 'data-kg-thumbnail') ??
        styles.bgImage(video)

      const result: MediaResolverResult = { tag: 'video', src: source }

      if (thumbnail) {
        result.poster = thumbnail
      }

      const { width, height } = getElementDimensions(video)

      if (width && height) {
        result.width = width
        result.height = height
      }

      return result
    }

    const source = attr(element.querySelector('audio[src]'), 'src')

    if (!source) {
      return
    }

    // The track name Ghost prints beside the file. It is the one piece of the audio card that is
    // content rather than chrome, and matching the card whole would otherwise delete it.
    const title = element.querySelector('.kg-audio-title')?.textContent?.trim()

    return {
      tag: 'audio',
      src: source,
      ...(title && { title }),
    }
  },
}
