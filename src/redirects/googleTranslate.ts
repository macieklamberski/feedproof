import type { RedirectExtractor } from '../types.js'

const googleTranslateHostRegex = /^translate\.google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2,3})?)$/

// Google Translate (translate.google.<TLD>/translate?u=<target>).
export const extractGoogleTranslateRedirect: RedirectExtractor = (url) => {
  if (googleTranslateHostRegex.test(url.hostname) && url.pathname === '/translate') {
    return url.searchParams.get('u') ?? null
  }

  return null
}
