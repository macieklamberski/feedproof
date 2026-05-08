import type { RedirectExtractor } from '../types.js'

// Facebook link shim (l.facebook.com/l.php?u=<target>).
export const extractFacebookShim: RedirectExtractor = (url) => {
  if (
    (url.hostname === 'l.facebook.com' || url.hostname === 'lm.facebook.com') &&
    url.pathname === '/l.php'
  ) {
    return url.searchParams.get('u') ?? null
  }

  return null
}
