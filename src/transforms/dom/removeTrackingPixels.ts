import { escapeRegex, parseUrl } from 'trousse'
import type { DomTransform } from '../../types.js'
import {
  getElementDimensions,
  hasZeroOpacity,
  isElementHidden,
  pixelDimensionLimit,
} from '../../utils/dom.js'

// `[./]` anchors require the segment to terminate with `.` (file extension) or `/`
// (path boundary) to avoid false positives on words like `tracker` or `counter`.
const buildPathRegex = (segments: ReadonlyArray<string>): RegExp | null => {
  if (segments.length === 0) {
    return null
  }

  const alternation = segments.map((segment) => escapeRegex(segment)).join('|')

  // The [./] terminator keeps a segment from matching inside words like tracker or counter.
  return new RegExp(`/(?:${alternation})[./]`, 'i')
}

const isTrackingUrl = (src: string, hosts: Set<string>, pathRegex: RegExp | null): boolean => {
  const url = parseUrl(src, 'http://placeholder/')

  if (!url) {
    return false
  }

  const hostname = url.hostname

  if (hosts.size > 0) {
    if (hosts.has(hostname)) {
      return true
    }

    for (const host of hosts) {
      if (hostname.endsWith(`.${host}`)) {
        return true
      }
    }
  }

  return pathRegex?.test(url.pathname) ?? false
}

const isPixelDimension = (value: number | undefined): boolean => {
  return value !== undefined && value <= pixelDimensionLimit
}

const isPixelSized = (dimensions: { width?: number; height?: number }): boolean => {
  return isPixelDimension(dimensions.width) || isPixelDimension(dimensions.height)
}

// gif stays out of the raster list: it is the dominant spacer and pixel format.
// Tracking pixels ship as GIF or script beacons.
const rasterExtensionRegex = /\.(?:jpe?g|png|webp|avif)(?:$|[?#])/i
const rasterFormatQueryRegex = /[?&](?:format|fm|output)=(?:jpe?g|png|webp|avif)\b/i

// A raster src clears a 0x0 lazy placeholder only: raster beacons ship at 1x1 as well.
// A non-empty srcset is a content signal at any size.
// A 0x0 image still fires its request, and 0 or unset is the lazy-load placeholder convention.
const hasContentImageSignal = (
  image: Element,
  dimensions: { width?: number; height?: number },
): boolean => {
  const srcset = image.getAttribute('srcset')

  if (srcset && srcset.trim().length > 0) {
    return true
  }

  if (dimensions.width !== 0 && dimensions.height !== 0) {
    return false
  }

  const src = image.getAttribute('src')

  return !!src && (rasterExtensionRegex.test(src) || rasterFormatQueryRegex.test(src))
}

// A tracking pixel: a hidden or pixel-sized <img> whose only job is to fire a request.
export const removeTrackingPixels: DomTransform = (context) => {
  const hosts = new Set(context.trackingHosts)
  const pathRegex = buildPathRegex(context.trackingPathSegments)
  const hasUrlChecks = hosts.size > 0 || pathRegex !== null

  return (document) => {
    const images = document.querySelectorAll('img')

    for (const image of images) {
      if (isElementHidden(image) || hasZeroOpacity(image)) {
        image.remove()
        continue
      }

      const dimensions = getElementDimensions(image)

      if (isPixelSized(dimensions) && !hasContentImageSignal(image, dimensions)) {
        image.remove()
        continue
      }

      if (hasUrlChecks) {
        const src = image.getAttribute('src')

        if (src && isTrackingUrl(src, hosts, pathRegex)) {
          image.remove()
        }
      }
    }
  }
}
