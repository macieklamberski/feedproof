import { getDimensions } from '../../common.js'
import type { DomTransform } from '../../types.js'

const styleDisplayNoneRegex = /(?:^|;)\s*display\s*:\s*none/i
const styleVisibilityHiddenRegex = /(?:^|;)\s*visibility\s*:\s*hidden/i
const styleOpacityZeroRegex = /(?:^|;)\s*opacity\s*:\s*0(?:\.0+)?\s*(?:;|$)/i

const pixelDimensionLimit = 2

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

const isPixelSized = (image: Element): boolean => {
  const { width, height } = getDimensions(image)
  return isPixelDimension(width) || isPixelDimension(height)
}

const isHiddenImage = (image: Element, style: string | null): boolean => {
  if (image.hasAttribute('hidden')) {
    return true
  }

  if (!style) {
    return false
  }

  return (
    styleDisplayNoneRegex.test(style) ||
    styleVisibilityHiddenRegex.test(style) ||
    styleOpacityZeroRegex.test(style)
  )
}

export const removeTrackingPixels: DomTransform = (context) => {
  const hosts = new Set(context.trackingHosts)
  const pathRegex = buildPathRegex(context.trackingPathSegments)
  const hasUrlChecks = hosts.size > 0 || pathRegex !== null

  return (document) => {
    const images = document.querySelectorAll('img')

    for (const image of images) {
      if (isPixelSized(image) || isHiddenImage(image, image.getAttribute('style'))) {
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
