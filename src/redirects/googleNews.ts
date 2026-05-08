import type { RedirectExtractor } from '../types.js'

const GOOGLE_NEWS_HOST = /^news\.google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2,3})?)$/

// Google News legacy redirect (news.google.<TLD>/news/url?url=<target>).
// Modern news.google.<TLD>/articles/<base64> URLs aren't unwrappable client-side.
export const extractGoogleNewsRedirect: RedirectExtractor = (url) => {
  if (GOOGLE_NEWS_HOST.test(url.hostname) && url.pathname === '/news/url') {
    return url.searchParams.get('url') ?? null
  }

  return null
}
