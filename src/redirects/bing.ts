import type { RedirectExtractor } from '../types.js'

const bingHostRegex = /^(?:www\.|cn\.)?bing\.com$/
const bingPrefixRegex = /^a\d/

// Bing search-result redirect (www.bing.com/ck/a?u=a1<base64url>). The `u`
// parameter is a base64url-encoded URL prefixed by a two-byte version marker
// (`a1`, `a2`, ...).
export const extractBingRedirect: RedirectExtractor = (url) => {
  if (!bingHostRegex.test(url.hostname) || url.pathname !== '/ck/a') {
    return
  }

  const value = url.searchParams.get('u')
  if (!value || !bingPrefixRegex.test(value)) {
    return
  }

  try {
    const decoded = Buffer.from(value.slice(2), 'base64url').toString('utf-8')
    if (!decoded.startsWith('https://') && !decoded.startsWith('http://')) {
      return
    }
    return decoded
  } catch {}
}
