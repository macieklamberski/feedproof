import type { DomTransform } from '../../types.js'
import { getElementDimensions, pixelDimensionLimit } from '../../utils/dom.js'
import { getUrlDimensions, parseSrcset } from '../../utils/images.js'

// Largest-width candidate URL in a srcset, so a src-less responsive image can still
// have its dimensions read from a rendition URL. Falls back to the last candidate when
// no w-descriptors are present (density-only srcset).
const widestSrcsetUrl = (srcset: string | null): string | null => {
  if (!srcset) {
    return null
  }

  const entries = parseSrcset(srcset)

  if (entries.length === 0) {
    return null
  }

  let widest = entries[entries.length - 1]

  for (const entry of entries) {
    if ((entry.width ?? 0) > (widest.width ?? 0)) {
      widest = entry
    }
  }

  return widest.url
}

// Both dimensions, only when each is above the tracking-pixel threshold (a real
// content image is never that small, and a promoted pixel-sized value would let
// removeTrackingPixels read it as a tracker). getElementDimensions reads width/height
// attributes then numeric `width:`/`height:` in inline style, so `max-*`/`auto`/`%`
// never qualify.
const promotableDimensions = (element: Element): { width: number; height: number } | undefined => {
  const { width, height } = getElementDimensions(element)

  if (
    width !== undefined &&
    height !== undefined &&
    width > pixelDimensionLimit &&
    height > pixelDimensionLimit
  ) {
    return { width, height }
  }
}

// A valid width/height attribute value: a positive integer of pixels.
const positiveIntegerRegex = /^[1-9]\d*$/

// An <img> often declares its size on the wrapping <picture>/<source> rather than
// itself. First <source> carrying both dimensions wins, else the <picture> element.
const pictureDimensions = (picture: Element): { width: number; height: number } | undefined => {
  for (const source of picture.querySelectorAll('source')) {
    const dimensions = promotableDimensions(source)

    if (dimensions) {
      return dimensions
    }
  }

  return promotableDimensions(picture)
}

// Backfills width/height attributes on media that lacks them, from (in order) the element's own
// inline style, a size encoded in its src URL, or, for an <img> in a <picture>, the wrapping
// picture/source. The width/height attributes drive the browser's `aspect-ratio: auto w/h`, so
// space is reserved and the ratio survives under reader CSS like `img { height: auto }`.
//
// Runs after fixLazyImages, so a lazy image's real URL is already in src and is read like any
// other, and before flattenPictureElements, so the picture/source carriers it reads still exist.
export const resolveMediaDimensions: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll('img, video')) {
      // The width/height attributes take a positive pixel integer. Drop any other value
      // (auto, a percentage, zero, junk) so it neither blocks the backfill below nor, left
      // in the markup, trips reader CSS that keys off the attribute's mere presence.
      for (const attribute of ['width', 'height']) {
        const value = element.getAttribute(attribute)?.trim()

        if (value !== undefined && !positiveIntegerRegex.test(value)) {
          element.removeAttribute(attribute)
        }
      }

      if (element.hasAttribute('width') && element.hasAttribute('height')) {
        continue
      }

      let dimensions = promotableDimensions(element)

      if (!dimensions) {
        dimensions = getUrlDimensions(element.getAttribute('src'))
      }

      if (!dimensions) {
        dimensions = getUrlDimensions(widestSrcsetUrl(element.getAttribute('srcset')))
      }

      if (
        !dimensions &&
        element.localName === 'img' &&
        element.parentElement?.localName === 'picture'
      ) {
        dimensions = pictureDimensions(element.parentElement)
      }

      if (!dimensions) {
        continue
      }

      // When the element already declares one dimension, the resolved pair only supplies
      // the aspect ratio: a feed that says height="60" for a 480x512 source is asking for
      // a 56x60 rendering, not 480x60.
      const declaredWidth = Number(element.getAttribute('width'))
      const declaredHeight = Number(element.getAttribute('height'))

      if (declaredWidth) {
        element.setAttribute(
          'height',
          String(Math.round((declaredWidth * dimensions.height) / dimensions.width)),
        )
      } else if (declaredHeight) {
        element.setAttribute(
          'width',
          String(Math.round((declaredHeight * dimensions.width) / dimensions.height)),
        )
      } else {
        element.setAttribute('width', String(Math.round(dimensions.width)))
        element.setAttribute('height', String(Math.round(dimensions.height)))
      }
    }
  }
}
