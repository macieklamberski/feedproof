import type { RedirectExtractor } from '../types.js'

// Google Translate (translate.google.com/translate?u=<target>).
export const extractGoogleTranslateRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'translate.google.com' && url.pathname === '/translate') {
    return url.searchParams.get('u') ?? null
  }

  return null
}
