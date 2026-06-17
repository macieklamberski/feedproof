import { getElementDimensions, pixelDimensionLimit } from '../../common.js'
import type { DomTransform } from '../../types.js'

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

// Dimensions encoded in the image URL: a filename or path `800x600`, `?w=&h=` /
// `?width=&height=`, or `s=WxH`. This is the intrinsic size of that rendition, a
// safer source than an inline-style display box. A `data:` placeholder (a lazy
// image not yet resolved) carries no size and is skipped.
const urlPairRegex = /(?:^|[/_=-])(\d{2,5})x(\d{2,5})(?=[._\-&)?]|$)/gi
const urlQueryWidthRegex = /[?&](?:w|width)=(\d{2,5})\b/i
const urlQueryHeightRegex = /[?&](?:h|height)=(\d{2,5})\b/i

const urlDimensions = (src: string | null): { width: number; height: number } | undefined => {
  if (!src || src.startsWith('data:')) {
    return
  }

  // Explicit w/h query params win; otherwise the last WxH pair in the path or
  // filename (the rendition size sits after any path digits).
  let width = Number(urlQueryWidthRegex.exec(src)?.[1])
  let height = Number(urlQueryHeightRegex.exec(src)?.[1])

  if (!(width > pixelDimensionLimit && height > pixelDimensionLimit)) {
    const pair = [...src.matchAll(urlPairRegex)].at(-1)
    width = Number(pair?.[1])
    height = Number(pair?.[2])
  }

  if (width > pixelDimensionLimit && height > pixelDimensionLimit) {
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

// Backfills width/height attributes on media that lacks them, from (in order) the
// element's own inline style, a size encoded in its src URL, or — for an <img> in a
// <picture> — the wrapping picture/source. The width/height attributes drive the
// browser's `aspect-ratio: auto w/h`, so space is reserved and the ratio survives
// under reader CSS like `img { height: auto }`.
// Runs after fixLazyImages, so a lazy image's real URL is already in src and is read
// like any other, and before flattenPictureElements, so the picture/source carriers it
// reads still exist.
export const resolveMediaDimensions: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll('img, video')) {
      if (element.hasAttribute('width') && element.hasAttribute('height')) {
        continue
      }

      let dimensions = promotableDimensions(element)

      if (!dimensions) {
        dimensions = urlDimensions(element.getAttribute('src'))
      }

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
