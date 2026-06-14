import { getDimensions } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Both dimensions, only when each resolves to a positive number. getDimensions
// reads width/height attributes then numeric `width:`/`height:` in inline style,
// so `max-*`/`auto`/`%` never qualify.
const positiveDimensions = (element: Element): { width: number; height: number } | undefined => {
  const { width, height } = getDimensions(element)

  if (width !== undefined && height !== undefined && width > 0 && height > 0) {
    return { width, height }
  }
}

// An <img> often declares its size on the wrapping <picture>/<source> rather than
// itself. First <source> carrying both dimensions wins, else the <picture> element.
const pictureDimensions = (picture: Element): { width: number; height: number } | undefined => {
  for (const source of picture.querySelectorAll('source')) {
    const dimensions = positiveDimensions(source)

    if (dimensions) {
      return dimensions
    }
  }

  return positiveDimensions(picture)
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

      let dimensions = positiveDimensions(element)

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
