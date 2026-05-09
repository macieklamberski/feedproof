import type { RedirectExtractor } from '../types.js'

const pathRegex = /^\/web\/\d{14}\*?\/(.+)$/

// Web Archive snapshot wrapper (web.archive.org/web/<timestamp>/<URL>).
// Extracts the original URL. Users wanting the archived view should remove
// this from defaultRedirectExtractors in their TransformContentOptions.
export const extractWebArchive: RedirectExtractor = (url) => {
  if (url.hostname !== 'web.archive.org') {
    return null
  }

  const match = url.pathname.match(pathRegex)
  if (!match) {
    return null
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}
