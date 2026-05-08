import type { RedirectExtractor } from '../types.js'

// Pocket redirect (getpocket.com/redirect?url=<target>).
export const extractPocketRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'getpocket.com' && url.pathname === '/redirect') {
    return url.searchParams.get('url') ?? null
  }

  return null
}
