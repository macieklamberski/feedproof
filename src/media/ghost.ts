import { coerceNumber } from 'trousse'
import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// Ghost's video and audio cards carry a real media element pointing at the author's upload,
// but in feeds from Ghost versions before its own June 2026 RSS cleanup the element ships
// without `controls` (so it renders unplayable), the video's `poster` is a transparent
// spacer gif (the real thumbnail sits in `data-kg-thumbnail`/`data-kg-custom-thumbnail` on
// the figure), and the card's scripted player chrome survives as junk. Resolving the inner
// element into a fresh native one drops the chrome wholesale. The video selector matches
// the chrome container, not the figure, so the author's figcaption beside it survives. The
// audio card is matched whole since Ghost's own cleanup keeps nothing else from it.
// Cleaned feeds carry no `.kg-video-container`, so their video cards are left alone.
export const ghostMediaResolver: MediaResolver = {
  selector: '.kg-video-card .kg-video-container, .kg-audio-card',
  extract: (element): MediaResolverResult | undefined => {
    if (element.classList.contains('kg-video-container')) {
      const video = element.querySelector('video[src]')
      const source = attr(video, 'src')

      if (!video || !source) {
        return
      }

      const figure = element.closest('.kg-video-card')
      const thumbnail =
        attr(figure, 'data-kg-custom-thumbnail') ?? attr(figure, 'data-kg-thumbnail')
      // The element's own poster is the transparent spacer, so only the figure's
      // thumbnail attributes are worth carrying over.
      const result: MediaResolverResult = { tag: 'video', src: source }

      if (thumbnail) {
        result.poster = thumbnail
      }

      const width = coerceNumber(attr(video, 'width'))
      const height = coerceNumber(attr(video, 'height'))

      if (width && height) {
        result.width = width
        result.height = height
      }

      return result
    }

    const source = attr(element.querySelector('audio[src]'), 'src')

    return source ? { tag: 'audio', src: source } : undefined
  },
}
