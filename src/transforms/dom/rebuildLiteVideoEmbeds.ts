import { composeEmbedUrl } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'

// `start` carries a whole-second offset; guard it so only digits reach the URL and a
// crafted value can't inject extra query params.
const startSecondsPattern = /^\d+$/

// lite-youtube / lite-vimeo (and their forks) are JS web components that hold the video
// id in a `videoid` attribute and build the real iframe on click. A reader runs no JS,
// so the video never appears. Each entry maps the custom tag to the embed URL built
// from the id, applying the `start` offset the way that platform's player expects.
const embedSources: Record<string, (id: string, start?: string) => string> = {
  'lite-youtube': (id, start) => {
    return composeEmbedUrl(id, start ? { start } : undefined)
  },
  'lite-vimeo': (id, start) => {
    return `https://player.vimeo.com/video/${id}${start ? `#t=${start}s` : ''}`
  },
}

// Rebuilds a plain <iframe> from a lite-youtube / lite-vimeo custom element so the
// later convertWidgets turns the YouTube one into a placeholder. Vimeo
// has no resolver yet, so it stays a raw iframe — still better than a dead custom
// element a reader can't activate. Carries over the `start` offset and `videotitle`.
export const rebuildLiteVideoEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('lite-youtube[videoid], lite-vimeo[videoid]')) {
    const buildSource = embedSources[element.localName]
    const videoId = element.getAttribute('videoid')

    if (!buildSource || !videoId) {
      continue
    }

    const start = element.getAttribute('start')
    const startSeconds = start && startSecondsPattern.test(start) ? start : undefined

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', buildSource(videoId, startSeconds))

    const videoTitle = element.getAttribute('videotitle')
    if (videoTitle) {
      iframe.setAttribute('title', videoTitle)
    }

    element.replaceWith(iframe)
  }
}
