import type { DomTransform } from '../types.js'

export const extractRedirectTarget = (url: URL): string | null => {
  // Google redirect (google.com/url?url=<target> or google.com/url?q=<target>).
  if (url.hostname === 'www.google.com' && url.pathname === '/url') {
    return url.searchParams.get('url') ?? url.searchParams.get('q') ?? null
  }

  // Facebook link shim (l.facebook.com/l.php?u=<target>).
  if (
    (url.hostname === 'l.facebook.com' || url.hostname === 'lm.facebook.com') &&
    url.pathname === '/l.php'
  ) {
    return url.searchParams.get('u') ?? null
  }

  return null
}

export const unwrapRedirectUrls: DomTransform = () => {
  return (document) => {
    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href')

      if (!href) {
        continue
      }

      try {
        const url = new URL(href)
        const target = extractRedirectTarget(url)

        if (target) {
          anchor.setAttribute('href', target)
        }
      } catch {}
    }
  }
}
