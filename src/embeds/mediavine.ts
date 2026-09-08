import { trimObject } from 'trousse'
import { attr, parseRatio } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

// The video.js player page that Mediavine's own dashboard frames to preview a video. The same
// route without the `/iframe` suffix also answers 200, but it is the embed-code generator behind
// a login and it is served `x-frame-options: SAMEORIGIN`, so a reader that framed it would show
// an empty box. The id is encoded on the way into the path because the div carrier takes its
// attribute as written: unescaped, `data-video-id="../../evil"` names a different page on the
// host and `data-video-id="a?autoplay=1"` appends a query.
const composeEmbedUrl = (videoId: string): string => {
  return `https://embed.mediavine.com/videos/${encodeURIComponent(videoId)}/iframe`
}

// Mediavine ships a video as an empty `<div class="mv-video-target mv-video-id-{id}"
// data-video-id="{id}">` that its script builds into a player, so a reader shows nothing at
// all. The player page is mintable from the id alone, and a fabricated id answers 404 there.
// Mediavine has no public watch page, so the placeholder carries no `url`.
export const mediavineWidgetEmbedResolver = createMarkupEmbedResolver(
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
      ...trimObject({ ratio }),
    }
  },
)

// The older snippet names the video only in the loader script's url and leaves the div beside it
// with nothing but an `id` matching that same video id, so neither element renders and the div is
// stripped as empty: the video is gone from the item. The id is letters and digits, and only
// that alphabet is checked before it goes into the player url: a wrong id fails the same whether
// it is minted or passed through, and a length bound would refuse the next id space.
const scriptIdRegex = /^\/videos\/([A-Za-z0-9]+)\.js$/

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
      ...trimObject({ ratio }),
    }
  },
)
