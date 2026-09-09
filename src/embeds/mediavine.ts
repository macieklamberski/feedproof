import { trimObject } from 'trousse'
import { attr, parseRatio } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

const composeEmbedUrl = (videoId: string): string => {
  return `https://embed.mediavine.com/videos/${encodeURIComponent(videoId)}/iframe`
}

// Mediavine ships a video as an empty div.mv-video-target its script builds into a player.
export const mediavineWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.mv-video-target[data-video-id]',
  (element) => {
    const videoId = attr(element, 'data-video-id')

    if (!videoId) {
      return
    }

    const ratio = parseRatio(attr(element, 'data-ratio') ?? '')

    return {
      provider: 'mediavine',
      id: videoId,
      src: composeEmbedUrl(videoId),
      ...trimObject({ ratio }, Boolean),
    }
  },
)

const scriptIdRegex = /^\/videos\/([A-Za-z0-9]+)\.js$/

const mediavineHosts = ['mediavine.com']

const readTargetRatio = (element: Element, videoId: string): string | undefined => {
  const target = element.ownerDocument.getElementById(videoId)

  return parseRatio(attr(target, 'data-ratio') ?? '')
}

// Mediavine's older snippet: a loader script naming the video beside a div holding only its id.
export const mediavineScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="video.mediavine.com/videos/"]',
  (element) => {
    const parsed = parseUrlOnHosts(attr(element, 'src'), mediavineHosts)
    const videoId = parsed?.pathname.match(scriptIdRegex)?.[1]

    if (!videoId) {
      return
    }

    const ratio = readTargetRatio(element, videoId)

    return {
      provider: 'mediavine',
      id: videoId,
      src: composeEmbedUrl(videoId),
      ...trimObject({ ratio }, Boolean),
    }
  },
)
