import { composeEmbedUrl, pickEmbedParams } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'

// `start` carries a whole-second offset; guard it so only digits reach the URL and a
// crafted value can't inject extra query params.
const startSecondsPattern = /^\d+$/

// lite-youtube / lite-vimeo (and their forks) are JS web components that hold the video
// id in a `videoid` attribute and build the real iframe on click. A reader runs no JS,
// so the video never appears. Each entry maps the custom tag to the embed URL built
// from the id, applying the `start` offset the way that platform's player expects.
const embedSources: Record<string, (id: string, params: Record<string, string>) => string> = {
  'lite-youtube': (id, params) => {
    return composeEmbedUrl(id, params)
  },
  'lite-vimeo': (id, params) => {
    return `https://player.vimeo.com/video/${id}${params.start ? `#t=${params.start}s` : ''}`
  },
}

// Rebuilds a plain <iframe> from a lite-youtube / lite-vimeo custom element so the later
// convertWidgets turns it into a placeholder, which both providers now have a resolver for.
// Carries over the `start` offset, the whitelisted half of `params`, and `videotitle`.
export const rebuildLiteVideoEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('lite-youtube[videoid], lite-vimeo[videoid]')) {
    const buildSource = embedSources[element.localName]
    const videoId = element.getAttribute('videoid')

    if (!buildSource || !videoId) {
      continue
    }

    // The options arrive either as the dedicated `start` attribute or inside `params`, and a
    // component may state both. The attribute is the more specific of the two, so it wins.
    const params = pickEmbedParams(element.getAttribute('params') ?? '')
    const start = element.getAttribute('start')

    if (start && startSecondsPattern.test(start)) {
      params.start = start
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', buildSource(videoId, params))

    const videoTitle = element.getAttribute('videotitle')
    if (videoTitle) {
      iframe.setAttribute('title', videoTitle)
    }

    element.replaceWith(iframe)
  }
}
