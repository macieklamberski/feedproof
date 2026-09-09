import { trimObject } from 'trousse'
import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr, getElementDimensions } from '../utils/dom.js'
import * as styles from '../utils/styles.js'

// Ghost's video and audio cards ship their media element without controls, so it never plays.
// Feeds from after Ghost's June 2026 RSS cleanup carry neither container and are left alone.
// The card's scripted player chrome ships with the element and survives in a feed as junk.
export const ghostMediaResolver: MediaResolver = {
  kind: 'media',
  // Matching the card instead of its player container would drop the figcaption and cover image.
  selector: '.kg-video-card .kg-video-container, .kg-audio-card .kg-audio-player-container',
  extract: (element): MediaResolverResult | undefined => {
    if (element.classList.contains('kg-video-container')) {
      const video = element.querySelector('video[src]')
      const source = attr(video, 'src')

      if (!video || !source) {
        return
      }

      const figure = element.closest('.kg-video-card')
      // The video's own poster is a transparent spacer gif, so it is never read.
      // Cards older than the figure's thumbnail attributes write it as the video's background.
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

    // Ghost prints the track name inside the player container, so it is dropped with the chrome.
    const title = element.querySelector('.kg-audio-title')?.textContent?.trim()

    return {
      tag: 'audio',
      src: source,
      ...trimObject({ title }, Boolean),
    }
  },
}
