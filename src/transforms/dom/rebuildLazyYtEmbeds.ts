import { composeEmbedUrl } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'

// The jQuery lazyYT plugin renders a facade `<div class="lazyYT" data-youtube-id="{id}">`
// that carries the YouTube id and builds the real iframe with JS on click. A reader runs no
// JS, so the video never appears. Rebuild a plain <iframe> from the id so
// replaceEmbedsWithPlaceholders can placeholder it.
export const rebuildLazyYtEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('div.lazyYT[data-youtube-id]')) {
    const videoId = element.getAttribute('data-youtube-id')
    if (!videoId) {
      continue
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', composeEmbedUrl(videoId))

    // Carry the facade's pixel size so the placeholder downstream can reserve the right space.
    const width = element.getAttribute('data-width')
    const height = element.getAttribute('data-height')

    if (width) {
      iframe.setAttribute('width', width)
    }

    if (height) {
      iframe.setAttribute('height', height)
    }

    element.replaceWith(iframe)
  }
}
