import type { CleanUrlFn, DomTransform } from '../../types.js'
import { removeWithEmptyWrappers, walkElements } from '../../utils/dom.js'
import { getImageFingerprint } from '../../utils/images.js'
import { enclosureMarker } from './injectEnclosures.js'

const existingMediaSelector =
  'audio[src], video[src], iframe[src], source[src], img[src], [data-embed-src]'

// Audio, video and embeds have no scaled variants, and the query can be their whole identity, a
// YouTube watch?v= or a player page carrying the file in ?url=, so the image key's query-drop
// would merge different episodes. They match on the exact cleaned url.
const buildMediaKey = (element: Element, cleanUrlFn?: CleanUrlFn): string => {
  const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src') ?? ''

  if (element.localName === 'img') {
    return getImageFingerprint(src, cleanUrlFn)
  }

  return cleanUrlFn ? cleanUrlFn(src) : src
}

// Removes an injected enclosure media element that duplicates inline content:
// an image already present (in any size variant) or an audio/video/embed with the
// same URL. Runs after injectEnclosures, which marks the elements it injects.
export const stripDuplicateEnclosures: DomTransform = (context) => (document) => {
  // Look for injected enclosures first (see walkElements). When there are none:
  // the common case: skip the media scan and fingerprinting altogether.
  const injected: Array<Element> = []

  walkElements(document, (element) => {
    if (element.hasAttribute(enclosureMarker)) {
      injected.push(element)
    }
  })

  if (injected.length === 0) {
    return
  }

  const contentKeys = new Set<string>()

  for (const element of document.querySelectorAll(existingMediaSelector)) {
    if (element.hasAttribute(enclosureMarker)) {
      continue
    }

    contentKeys.add(buildMediaKey(element, context.cleanUrlFn))
  }

  for (const element of injected) {
    if (contentKeys.has(buildMediaKey(element, context.cleanUrlFn))) {
      removeWithEmptyWrappers(element)
      continue
    }

    // Keep it, but drop the marker so it doesn't leak into the output.
    element.removeAttribute(enclosureMarker)
  }
}
