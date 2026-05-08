import type { RedirectExtractor } from '../types.js'

// Google redirect (google.com/url?url=<target> or google.com/url?q=<target>).
export const extractGoogleRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'www.google.com' && url.pathname === '/url') {
    return url.searchParams.get('url') ?? url.searchParams.get('q') ?? null
  }

  return null
}
