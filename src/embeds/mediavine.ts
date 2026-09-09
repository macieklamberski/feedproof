import { trimObject } from 'trousse'
import { attr, parseRatio } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

// Without /iframe the route answers 200 but is served x-frame-options: SAMEORIGIN.
// A fabricated id answers 404 on the /iframe route.
const composeEmbedUrl = (videoId: string): string => {
  // The div carrier's id goes in as written: unescaped, ../../evil names another page.
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

    // The div carries the player's aspect ratio as `data-ratio="{w}:{h}"`.
    const ratio = parseRatio(attr(element, 'data-ratio') ?? '')

    // Mediavine has no public watch page.
    return {
      provider: 'mediavine',
      id: videoId,
      src: composeEmbedUrl(videoId),
      ...trimObject({ ratio }, Boolean),
    }
  },
)

const scriptIdRegex = /^\/videos\/([A-Za-z0-9]+)\.js$/

// The selector matches on a substring, so any host can spell `video.mediavine.com/videos` inside
// its own path and reach this. The path shape alone must not mint a Mediavine url.
const mediavineHosts = ['mediavine.com']

const readTargetRatio = (element: Element, videoId: string): string | undefined => {
  const target = element.ownerDocument.getElementById(videoId)

  return parseRatio(attr(target, 'data-ratio') ?? '')
}

// Mediavine's older snippet: a loader script naming the video beside a div holding only its id.
// Neither renders: a reader strips the script, then the empty div.
export const mediavineScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="video.mediavine.com/videos/"]',
  (element) => {
    // The selector matches a substring any host can carry, so the host is checked here.
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
