import { escapeRegex } from 'trousse'
import { extractVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { removeWithEmptyWrappers } from '../../utils/dom.js'
import { updateEmbedPlaceholder } from '../../utils/widgets.js'
import { enclosureMarker } from './injectEnclosures.js'

// A YouTube thumbnail URL carries the video id in a `/vi/{id}/` segment, e.g.
// https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg. extractVideoId only reads
// watch/embed/short URLs, so the poster side needs its own match.
const thumbnailIdPattern = /\/vi\/([a-zA-Z0-9_-]{11})\//

// A player without a resolver, like JW Player, carries no data-embed-provider to match on.
const videoHostFragments = [
  'youtube.com', // YouTube
  'youtu.be', // YouTube share links
  'player.vimeo.com', // Vimeo player
  'vimeo.com/video', // Vimeo video path
  'jwplayer', // JW Player (cdn.jwplayer.com)
  'dailymotion.com', // Dailymotion
  'wistia', // Wistia (fast.wistia.net/.com)
  'videopress.com', // VideoPress (WordPress.com)
  'brightcove', // Brightcove
  'streamable.com', // Streamable
  'v.redd.it', // Reddit-hosted video
]
const videoHostPattern = new RegExp(videoHostFragments.map(escapeRegex).join('|'), 'i')

// Map each embedded video's id to its element (placeholders carry data-embed-*, a
// raw iframe carries src) so an id-matched poster image can be moved onto it.
const collectEmbedsByVideoId = (document: Document): Map<string, Element> => {
  const embeds = new Map<string, Element>()

  for (const element of document.querySelectorAll('[data-embed-src], iframe[src]')) {
    const ids = new Set<string>()

    const dataId = element.getAttribute('data-embed-id')
    if (dataId) {
      ids.add(dataId)
    }

    for (const attribute of ['data-embed-src', 'data-embed-url', 'src']) {
      const value = element.getAttribute(attribute)
      const id = value ? extractVideoId(value) : undefined
      if (id) {
        ids.add(id)
      }
    }

    for (const id of ids) {
      if (!embeds.has(id)) {
        embeds.set(id, element)
      }
    }
  }

  return embeds
}

// The video element of a video-led item: a native <video>, or an embed
// (placeholder/iframe) pointing at a known video host.
const findVideoElement = (document: Document): Element | undefined => {
  const native = document.querySelector('video[src], video > source[src]')
  if (native) {
    return native.localName === 'source' ? (native.parentElement ?? undefined) : native
  }

  for (const element of document.querySelectorAll('[data-embed-src], iframe[src]')) {
    const src = element.getAttribute('data-embed-src') ?? element.getAttribute('src') ?? ''
    if (videoHostPattern.test(src)) {
      return element
    }
  }
}

// Give the video its poster, then drop the now-redundant standalone image. By default an
// existing poster is kept (e.g. a YouTube resolver thumbnail). Pass overwrite to replace it
// with a better one.
const moveImageToVideoPoster = (image: Element, video: Element, overwrite = false): void => {
  const url = image.getAttribute('src')

  if (url) {
    if (video.localName === 'video') {
      if (overwrite || !video.hasAttribute('poster')) {
        video.setAttribute('poster', url)
      }
    } else if (overwrite || !video.hasAttribute('data-embed-thumbnail')) {
      updateEmbedPlaceholder(video, { thumbnail: url })
    }
  }

  removeWithEmptyWrappers(image)
}

// A video's poster shipped as a second image: a thumbnail beside its embed, or an image enclosure.
// WordPress lazy-embed plugins ship the YouTube thumbnail beside the embed.
export const assignVideoPosters: DomTransform = () => (document) => {
  // (A) An inline image whose URL is a thumbnail of an embedded video, matched by id.
  const embedsByVideoId = collectEmbedsByVideoId(document)
  if (embedsByVideoId.size > 0) {
    for (const image of document.querySelectorAll('img[src]')) {
      const id = image.getAttribute('src')?.match(thumbnailIdPattern)?.[1]
      const embed = id ? embedsByVideoId.get(id) : undefined
      if (!embed) {
        continue
      }

      // Only a feed-defined enclosure thumbnail outranks the inline image, not a resolver's guess.
      const isFeedDefined = embed.hasAttribute(enclosureMarker)
      moveImageToVideoPoster(image, embed, !isFeedDefined)
    }
  }

  // (B) An injected image enclosure on a video-led item: a video is embedded and
  // the item has no inline image of its own: is the video's poster.
  const video = findVideoElement(document)
  if (!video || document.querySelector(`img[src]:not([${enclosureMarker}])`)) {
    return
  }

  for (const image of document.querySelectorAll(`img[${enclosureMarker}]`)) {
    moveImageToVideoPoster(image, video)
  }
}
