import type { RedirectExtractor } from '../types.js'

const yahooPathRegex = /\/RU=([^/]+)\/RK=/

// Yahoo Search redirect (r.search.yahoo.com/.../RU=<URL-encoded-target>/RK=...).
export const extractYahooSearchRedirect: RedirectExtractor = (url) => {
  if (url.hostname !== 'r.search.yahoo.com') {
    return
  }

  const match = url.pathname.match(yahooPathRegex)
  if (!match) {
    return
  }

  try {
    return decodeURIComponent(match[1])
  } catch {}
}
