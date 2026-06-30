import type { DomTransform } from '../../types.js'
import { getElementDimensions, isElementHidden, pixelDimensionLimit } from '../../utils/dom.js'

const styleOpacityZeroRegex = /(?:^|;)\s*opacity\s*:\s*0(?:\.0+)?\s*(?:;|$)/i

// `[./]` anchors require the segment to terminate with `.` (file extension) or `/`
// (path boundary) to avoid false positives on words like `tracker` or `counter`.
const buildPathRegex = (segments: ReadonlyArray<string>): RegExp | null => {
  if (segments.length === 0) {
    return null
  }

  const alternation = segments.map(RegExp.escape).join('|')

  return new RegExp(`/(?:${alternation})[./]`, 'i')
}

const isTrackingUrl = (src: string, hosts: Set<string>, pathRegex: RegExp | null): boolean => {
  try {
    const url = new URL(src, 'http://placeholder/')
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
  } catch {
    return false
  }
}

const isPixelDimension = (value: number | undefined): boolean => {
  return value !== undefined && value <= pixelDimensionLimit
}

const isPixelSized = (dimensions: { width?: number; height?: number }): boolean => {
  return isPixelDimension(dimensions.width) || isPixelDimension(dimensions.height)
}

// Raster sources signal a real content image (tracking pixels are GIF/script
// beacons), so we never strip them on the size heuristic. `.gif` is excluded —
// it is the dominant spacer/pixel format.
const rasterExtensionRegex = /\.(?:jpe?g|png|webp|avif)(?:$|[?#])/i
const rasterFormatQueryRegex = /[?&](?:format|fm|output)=(?:jpe?g|png|webp|avif)\b/i

// A `0×0` image still fires its request, so trackers do use it and dimension
// alone can't clear an image. But `0`/unset is the dominant lazy-load
// *placeholder* convention (real size set client-side), and at `0×0` a raster
// `src` is overwhelmingly real content — corpus `0×0` beacons are script/`.gif`
// endpoints, not raster files. A non-empty `srcset` is a content signal at any
// size. The hidden-style and tracking-host checks still apply regardless.
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

// An `opacity:0` image is a tracking-beacon trick. It's image-specific: a generic
// `opacity:0` is often a fade-in animation, so it stays here rather than in the shared
// isElementHidden check (which covers `display:none`/`visibility:hidden`/`[hidden]`).
const hasZeroOpacity = (image: Element): boolean => {
  const style = image.getAttribute('style')

  return !!style && styleOpacityZeroRegex.test(style)
}

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
