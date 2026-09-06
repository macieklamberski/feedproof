import { attr, parseRatio } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

// The player page, which is the only page Mediavine publishes for a video: there is no watch
// page, so the placeholder carries no `url`.
const composeEmbedUrl = (videoId: string): string => {
  return `https://embed.mediavine.com/videos/${videoId}`
}

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
      src: composeEmbedUrl(videoId),
      ...(ratio && { ratio }),
    }
  },
)

// The older snippet names the video only in the loader script's url and leaves the div beside it
// with nothing but an `id` matching that same video id, so neither element renders and the div is
// stripped as empty: the video is gone from the item. Mined uncapped from 140 corpus feeds, the
// 94 distinct ids are 84 of 20 characters and 10 of 19, alphanumeric in both cases, so an id
// outside that is refused rather than interpolated into a player url.
const scriptIdRegex = /^\/videos\/([A-Za-z0-9]{19,20})\.js$/

// The selector matches on a substring, so any host can spell `video.mediavine.com/videos` inside
// its own path and reach this. The path shape alone must not mint a Mediavine url.
const mediavineHosts = ['mediavine.com']

// The div states the player's shape and the script states the video, so the ratio is read off the
// element the script's own id points at rather than off a neighbour that merely sits nearby.
const readTargetRatio = (element: Element, videoId: string): string | undefined => {
  const target = element.ownerDocument.getElementById(videoId)

  return parseRatio(attr(target, 'data-ratio') ?? '')
}

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
      ...(ratio && { ratio }),
    }
  },
)
