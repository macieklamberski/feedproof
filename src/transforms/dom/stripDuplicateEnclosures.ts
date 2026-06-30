import type { CleanUrlFn, DomTransform } from '../../types.js'
import { removeWithEmptyWrappers } from '../../utils/dom.js'
import { getImageFingerprint } from '../../utils/images.js'
import { enclosureMarker } from './injectEnclosures.js'

const existingMediaSelector =
  'audio[src], video[src], iframe[src], source[src], img[src], [data-embed-src]'

// Audio/video/embed have no scaled variants, and their identity often lives in the
// query (podcast proxies like `…/play.mp3?url={episode}`), so the image key's
// query-drop would collapse distinct episodes. Match them on the exact cleaned URL.
const buildMediaKey = (element: Element, cleanUrlFn?: CleanUrlFn): string => {
  const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src') ?? ''

  if (element.localName === 'img') {
    return getImageFingerprint(src, cleanUrlFn)
  }

  return cleanUrlFn ? cleanUrlFn(src) : src
}

// Removes an injected enclosure media element that duplicates inline content —
// an image already present (in any size variant) or an audio/video/embed with the
// same URL. Runs after injectEnclosures, which marks the elements it injects.
export const stripDuplicateEnclosures: DomTransform = (context) => (document) => {
  const contentKeys = new Set<string>()

  for (const element of document.querySelectorAll(existingMediaSelector)) {
    if (element.hasAttribute(enclosureMarker)) {
      continue
    }

    contentKeys.add(buildMediaKey(element, context.cleanUrlFn))
  }

  for (const element of document.querySelectorAll(`[${enclosureMarker}]`)) {
    if (contentKeys.has(buildMediaKey(element, context.cleanUrlFn))) {
      removeWithEmptyWrappers(element)
      continue
    }

    // Keep it — but drop the marker so it doesn't leak into the output.
    element.removeAttribute(enclosureMarker)
  }
}
