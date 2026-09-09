import type { CleanUrlFn, DomTransform } from '../../types.js'
import { removeWithEmptyWrappers, walkElements } from '../../utils/dom.js'
import { getImageFingerprint } from '../../utils/images.js'
import { enclosureMarker } from './injectEnclosures.js'

const existingMediaSelector =
  'audio[src], video[src], iframe[src], source[src], img[src], [data-embed-src]'

// The image key drops the query, which is what tells podcast proxy episodes apart.
// A podcast proxy's audio url is `…/play.mp3?url={episode}`, so its identity lives in the query.
// Audio, video and embeds have no scaled variants.
const buildMediaKey = (element: Element, cleanUrlFn?: CleanUrlFn): string => {
  const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src') ?? ''

  if (element.localName === 'img') {
    return getImageFingerprint(src, cleanUrlFn)
  }

  return cleanUrlFn ? cleanUrlFn(src) : src
}

// An injected enclosure the body already carries inline shows the same media twice.
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
