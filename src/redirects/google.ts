import type { RedirectExtractor } from '../types.js'

const googleHostRegex = /^(?:www\.)?google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2,3})?)$/

// Google redirect (google.<TLD>/url?url=<target> or google.<TLD>/url?q=<target>).
export const extractGoogleRedirect: RedirectExtractor = (url) => {
  if (googleHostRegex.test(url.hostname) && url.pathname === '/url') {
    return url.searchParams.get('url') ?? url.searchParams.get('q') ?? null
  }

  return null
}
