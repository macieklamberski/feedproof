import type { DomTransform, RedirectExtractor } from '../types.js'

// Google redirect (google.com/url?url=<target> or google.com/url?q=<target>).
export const extractGoogleRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'www.google.com' && url.pathname === '/url') {
    return url.searchParams.get('url') ?? url.searchParams.get('q') ?? null
  }

  return null
}

// Google News legacy redirect (news.google.com/news/url?url=<target>).
// Modern news.google.com/articles/<base64> URLs aren't unwrappable client-side.
export const extractGoogleNewsRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'news.google.com' && url.pathname === '/news/url') {
    return url.searchParams.get('url') ?? null
  }

  return null
}

// Google Translate (translate.google.com/translate?u=<target>).
export const extractGoogleTranslateRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'translate.google.com' && url.pathname === '/translate') {
    return url.searchParams.get('u') ?? null
  }

  return null
}

// Pocket redirect (getpocket.com/redirect?url=<target>).
export const extractPocketRedirect: RedirectExtractor = (url) => {
  if (url.hostname === 'getpocket.com' && url.pathname === '/redirect') {
    return url.searchParams.get('url') ?? null
  }

  return null
}

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

export const defaultRedirectExtractors: Array<RedirectExtractor> = [
  extractGoogleRedirect,
  extractGoogleNewsRedirect,
  extractGoogleTranslateRedirect,
  extractPocketRedirect,
  extractFacebookShim,
]

export const extractRedirectTarget = (url: URL): string | null => {
  for (const extractor of defaultRedirectExtractors) {
    const target = extractor(url)

    if (target) {
      return target
    }
  }

  return null
}

export const unwrapRedirectUrls: DomTransform = (context) => {
  const extractors = context.redirectExtractors ?? defaultRedirectExtractors

  return (document) => {
    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href')

      if (!href) {
        continue
      }

      try {
        const url = new URL(href)

        for (const extractor of extractors) {
          const target = extractor(url)

          if (target) {
            anchor.setAttribute('href', target)
            break
          }
        }
      } catch {}
    }
  }
}
