import type { RedirectExtractor } from '../types.js'

const pathRegex = /^\/web\/\d{14}\*?\/(.+)$/

// Web Archive snapshot wrapper (web.archive.org/web/<timestamp>/<URL>).
// Not included in defaultRedirectExtractors: an archive URL is a historical
// snapshot at a specific point in time, not a redirect — unwrapping returns
// the live page, which may have changed or 404'd. Opt in by passing a custom
// redirectExtractors array.
export const extractWebArchive: RedirectExtractor = (url) => {
  if (url.hostname !== 'web.archive.org') {
    return
  }

  const match = url.pathname.match(pathRegex)
  if (!match) {
    return
  }

  try {
    return decodeURIComponent(match[1])
  } catch {}
}
