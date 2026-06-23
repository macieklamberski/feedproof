import { extractVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'

// A YouTube thumbnail URL carries the video id in a `/vi/{id}/` segment, e.g.
// https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg. extractVideoId only reads
// watch/embed/short URLs, so the poster side needs its own match.
const thumbnailIdPattern = /\/vi\/([a-zA-Z0-9_-]{11})\//

// Video ids of every embed already in the document (placeholders carry
// data-embed-src/-url/-id; a raw iframe carries src).
const collectEmbeddedVideoIds = (document: Document): Set<string> => {
  const ids = new Set<string>()

  for (const element of document.querySelectorAll('[data-embed-src], iframe[src]')) {
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
  }

  return ids
}

// Remove an element along with any wrapper (a/figure) it leaves empty, so a
// stripped poster doesn't leave a dangling link or empty figure behind.
const removeWithEmptyWrappers = (element: Element): void => {
  let current: Element | null = element

  while (current) {
    const parent: Element | null = current.parentElement
    current.remove()

    if (!parent || (parent.tagName !== 'A' && parent.tagName !== 'FIGURE')) {
      break
    }

    const isEmpty = parent.children.length === 0 && (parent.textContent ?? '').trim() === ''
    if (!isEmpty) {
      break
    }

    current = parent
  }
}

// Some feeds render a video as a poster image plus the embed (e.g. WordPress
// lazy-embed plugins). The embed placeholder already carries its own thumbnail,
// so the standalone poster image is a duplicate. Remove an image whose URL is the
// thumbnail of a video that is also embedded in the same item, matched by video id.
export const stripVideoPosterImages: DomTransform = () => (document) => {
  const videoIds = collectEmbeddedVideoIds(document)

  if (videoIds.size === 0) {
    return
  }

  for (const image of document.querySelectorAll('img[src]')) {
    const match = image.getAttribute('src')?.match(thumbnailIdPattern)

    if (match && videoIds.has(match[1])) {
      removeWithEmptyWrappers(image)
    }
  }
}
