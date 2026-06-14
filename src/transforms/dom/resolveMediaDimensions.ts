import { getDimensions, pixelDimensionLimit } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Both dimensions, only when each is above the tracking-pixel threshold (a real
// content image is never that small, and a promoted pixel-sized value would let
// removeTrackingPixels read it as a tracker). getDimensions reads width/height
// attributes then numeric `width:`/`height:` in inline style, so `max-*`/`auto`/`%`
// never qualify.
const promotableDimensions = (element: Element): { width: number; height: number } | undefined => {
  const { width, height } = getDimensions(element)

  if (
    width !== undefined &&
    height !== undefined &&
    width > pixelDimensionLimit &&
    height > pixelDimensionLimit
  ) {
    return { width, height }
  }
}

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

// Backfills width/height attributes on media that declares its size only in inline
// style, or — for an <img> in a <picture> — on the wrapping picture/source. The
// width/height attributes drive the browser's `aspect-ratio: auto w/h`, so space is
// reserved and the ratio survives under reader CSS like `img { height: auto }`.
// Runs before flattenPictureElements so the picture/source carriers still exist.
// Images that fixLazyImages later lifts out of a <noscript> are not seen here, but
// those carry their own width/height, so nothing is lost in practice.
export const resolveMediaDimensions: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll('img, video')) {
      if (element.hasAttribute('width') && element.hasAttribute('height')) {
        continue
      }

      let dimensions = promotableDimensions(element)

      if (
        !dimensions &&
        element.localName === 'img' &&
        element.parentElement?.localName === 'picture' &&
        !element.hasAttribute('width') &&
        !element.hasAttribute('height')
      ) {
        dimensions = pictureDimensions(element.parentElement)
      }

      if (!dimensions) {
        continue
      }

      if (!element.hasAttribute('width')) {
        element.setAttribute('width', String(Math.round(dimensions.width)))
      }

      if (!element.hasAttribute('height')) {
        element.setAttribute('height', String(Math.round(dimensions.height)))
      }
    }
  }
}
