import type { RedirectExtractor } from '../types.js'

// Google News legacy redirect (news.google.com/news/url?url=<target>).
// Modern news.google.com/articles/<base64> URLs aren't unwrappable client-side.
export const extractGoogleNewsRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'news.google.com' && url.pathname === '/news/url') {
    return url.searchParams.get('url') ?? null
  }

  return null
}
