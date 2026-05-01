import { defaultTrackingHosts, defaultTrackingPathSegments } from '../defaults.js'
import type { DomTransform } from '../types.js'

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

    for (const host of hosts) {
      if (url.hostname === host || url.hostname.endsWith(`.${host}`)) {
        return true
      }
    }

    return pathRegex?.test(url.pathname) ?? false
  } catch {
    return false
  }
}

export const removeTrackingPixels: DomTransform = (context) => {
  const hosts = new Set(context.trackingHosts ?? defaultTrackingHosts)
  const pathRegex = buildPathRegex(context.trackingPathSegments ?? defaultTrackingPathSegments)

  return (document) => {
    for (const image of document.querySelectorAll('img')) {
      const width = image.getAttribute('width')
      const height = image.getAttribute('height')
      const src = image.getAttribute('src')

      const isPixelSize =
        width !== null && height !== null && Number(width) <= 2 && Number(height) <= 2
      const isTrackingSrc = src ? isTrackingUrl(src, hosts, pathRegex) : false

      if (isPixelSize || isTrackingSrc) {
        image.remove()
      }
    }
  }
}
