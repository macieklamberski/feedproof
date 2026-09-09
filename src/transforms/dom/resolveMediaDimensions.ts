import type { DomTransform } from '../../types.js'
import { getElementDimensions, pixelDimensionLimit } from '../../utils/dom.js'
import { getUrlDimensions, widestSrcsetUrl } from '../../utils/images.js'
import { setDimensions } from '../../utils/widgets.js'

// A promoted pixel-sized value gets the image stripped by removeTrackingPixels.
// A real content image is never that small.
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

// An <img> often leaves its size to the wrapping <picture>/<source>. First <source> carrying
// both dimensions wins, else the <picture> element.
const pictureDimensions = (picture: Element): { width: number; height: number } | undefined => {
  for (const source of picture.querySelectorAll('source')) {
    const dimensions = promotableDimensions(source)

    if (dimensions) {
      return dimensions
    }
  }

  return promotableDimensions(picture)
}

// Media with no width and height loses its aspect ratio under reader CSS like height: auto.
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
        setDimensions(element, {
          height: Math.round((declaredWidth * dimensions.height) / dimensions.width),
        })
        continue
      }

      if (declaredHeight) {
        setDimensions(element, {
          width: Math.round((declaredHeight * dimensions.width) / dimensions.height),
        })
        continue
      }

      setDimensions(element, {
        width: Math.round(dimensions.width),
        height: Math.round(dimensions.height),
      })
    }
  }
}
