import type { RedirectExtractor } from '../types.js'

// AMP cache (cdn.ampproject.org/c/[s/]<hostname>/<path>). The optional
// publisher subdomain is a hint; the path always carries the canonical
// hostname.
export const extractAmpCache: RedirectExtractor = (url) => {
  if (
    url.hostname !== 'cdn.ampproject.org' &&
    !url.hostname.endsWith('.cdn.ampproject.org')
  ) {
    return null
  }

  const httpsMatch = url.pathname.match(/^\/c\/s\/(.+)$/)
  if (httpsMatch) {
    return `https://${httpsMatch[1]}`
  }

  const httpMatch = url.pathname.match(/^\/c\/(?!s\/)(.+)$/)
  if (httpMatch) {
    return `http://${httpMatch[1]}`
  }

  return null
}
