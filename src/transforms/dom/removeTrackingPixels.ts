import type { DomTransform } from '../../types.js'

const styleWidthRegex = /(?:^|;)\s*width\s*:\s*([0-9]*\.?[0-9]+)\s*(?:px)?\s*(?:;|$)/i
const styleHeightRegex = /(?:^|;)\s*height\s*:\s*([0-9]*\.?[0-9]+)\s*(?:px)?\s*(?:;|$)/i
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

const getDimension = (image: Element, prop: 'width' | 'height'): number | undefined => {
  const attribute = image.getAttribute(prop)

  if (attribute !== null) {
    const value = Number(attribute)

    if (Number.isFinite(value)) {
      return value
    }
  }

  const style = image.getAttribute('style')

  if (style) {
    const regex = prop === 'width' ? styleWidthRegex : styleHeightRegex
    const match = style.match(regex)

    if (match) {
      // Regex requires `[0-9]*\.?[0-9]+`, so Number() is always finite here.
      return Number(match[1])
    }
  }

  return
}

const isHiddenImage = (image: Element): boolean => {
  if (image.hasAttribute('hidden')) {
    return true
  }

  const style = image.getAttribute('style')

  if (!style) {
    return false
  }

  return (
    styleDisplayNoneRegex.test(style) ||
    styleVisibilityHiddenRegex.test(style) ||
    styleOpacityZeroRegex.test(style)
  )
}

const isPixelSized = (image: Element): boolean => {
  const width = getDimension(image, 'width')
  const height = getDimension(image, 'height')

  return (
    (width !== undefined && width <= pixelDimensionLimit) ||
    (height !== undefined && height <= pixelDimensionLimit)
  )
}

export const removeTrackingPixels: DomTransform = (context) => {
  const hosts = new Set(context.trackingHosts ?? [])
  const pathRegex = buildPathRegex(context.trackingPathSegments ?? [])

  return (document) => {
    const images = document.querySelectorAll('img')

    for (const image of images) {
      const src = image.getAttribute('src')
      const trackingSrc = src ? isTrackingUrl(src, hosts, pathRegex) : false

      if (isPixelSized(image) || isHiddenImage(image) || trackingSrc) {
        image.remove()
      }
    }
  }
}
