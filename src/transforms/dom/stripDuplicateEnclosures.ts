import { removeWithEmptyWrappers } from '../../common.js'
import type { CleanUrlFn, DomTransform } from '../../types.js'

// injectEnclosures injects every enclosure (no dedup) and tags each injected
// element with this attribute, so this pass can tell an injected lead media from
// the item's own inline content.
const enclosureMarker = 'data-enclosure'

const existingMediaSelector =
  'audio[src], video[src], iframe[src], source[src], img[src], [data-embed-src]'

// Size keywords feeds use as a whole filename for a scaled variant, e.g.
// .../{id}/large.jpg vs .../{id}/small.jpg. Conservative on purpose: words like
// "main"/"cover"/"default" are real filenames too often to treat as a size token.
// "wide" and "full" are deliberately left out for the same reason — they read as
// size hints but also turn up as genuine content filenames, and a false match here
// drops a real image. They are still covered when paired with dimensions (e.g.
// "wide__148x84") via dimensionLeaf, so the only thing excluding them loses is the
// rare bare "wide.jpg"/"full.jpg" variant. Add them back if that case shows up
// often enough in the corpus to outweigh the false-match risk.
const sizeKeywordLeaf =
  /^(x?small|x?large|medium|thumb|thumbnail|original|orig|preview)(\.[a-z0-9]+)?$/i
// A leaf that is purely a dimension descriptor, e.g. "640x360" or, with a crop
// name, "original__640x360" / "wide__148x84". No shared filename stem survives.
const dimensionLeaf = /^(.*__)?\d{1,5}x\d{1,5}(\.[a-z0-9]+)?$/i
// A WordPress-style dimension suffix on an otherwise-shared stem, e.g.
// "photo-800x450.jpg" is a scaled copy of "photo.jpg".
const wordpressDimensionSuffix = /-\d{1,5}x\d{1,5}(\.[a-z0-9]+)$/i

// Size-agnostic dedup key for images: a scaled or differently-cropped copy of an
// image already in the content shares this key. Most feeds encode the size in the
// URL and the variants are otherwise identical, so we strip the size signal and
// compare host + path:
//   - drop the query (cache-busters and ?w=/?width= render params)
//   - collapse a WordPress -WxH suffix back to the base filename
//   - drop a leaf that is only dimensions or only a size keyword (no stem to keep)
// The whole-leaf drops require a parent path to anchor on, so two unrelated
// root-level files like /large.jpg and /small.jpg are never collapsed.
const buildImageKey = (rawUrl: string, cleanUrlFn?: CleanUrlFn): string => {
  const cleaned = cleanUrlFn ? cleanUrlFn(rawUrl) : rawUrl

  let parsed: URL
  try {
    parsed = new URL(cleaned)
  } catch {
    return cleaned
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (segments.length) {
    const lastIndex = segments.length - 1
    const leaf = segments[lastIndex]

    if (wordpressDimensionSuffix.test(leaf)) {
      segments[lastIndex] = leaf.replace(wordpressDimensionSuffix, '$1')
    } else if (segments.length > 1 && (dimensionLeaf.test(leaf) || sizeKeywordLeaf.test(leaf))) {
      segments.pop()
    }
  }

  return `${parsed.host}/${segments.join('/')}`
}

// Audio/video/embed have no scaled variants, and their identity often lives in the
// query (podcast proxies like `…/play.mp3?url={episode}`), so the image key's
// query-drop would collapse distinct episodes. Match them on the exact cleaned URL.
const buildMediaKey = (element: Element, cleanUrlFn?: CleanUrlFn): string => {
  const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src') ?? ''

  if (element.localName === 'img') {
    return buildImageKey(src, cleanUrlFn)
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
