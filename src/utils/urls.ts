import { resolveUrl } from 'feedcanon'
import { parseUrl } from 'trousse'
import type { ResolveUrlFn } from '../types.js'

// Matches any URL that already carries a scheme (the URL-spec scheme grammar) — i.e.
// already absolute, so resolution must leave it byte-identical. Protocol-relative URLs
// (`//host/path`) have no scheme and are intentionally not matched, so they resolve to
// the base URL's scheme. Shared with resolveRelativeUrls so both treat URLs identically.
export const absoluteUrlRegex = /^[a-z][a-z0-9+.-]*:/i

// Resolves a relative URL against the base URL, keeping the original otherwise —
// an already-absolute/opaque URL, or a relative one that can't be resolved (no
// base). Mirrors resolveRelativeUrls' per-URL contract, so placeholder URLs are
// treated identically to content URLs without normalizing or dropping them.
// Overloaded so a definite URL returns a string (no undefined fallback needed at the
// call site); only a possibly-undefined input widens the result. The cast is needed
// because the body's `string | undefined` doesn't satisfy the string-returning signature.
type ResolveOrKeepUrl = {
  (url: string, resolveUrlFn: ResolveUrlFn, baseUrl: string | undefined): string
  (
    url: string | undefined,
    resolveUrlFn: ResolveUrlFn,
    baseUrl: string | undefined,
  ): string | undefined
}

export const resolveOrKeepUrl: ResolveOrKeepUrl = ((url, resolveUrlFn, baseUrl) => {
  if (!url || absoluteUrlRegex.test(url)) {
    return url || undefined
  }

  return resolveUrlFn(url, baseUrl) ?? url
}) as ResolveOrKeepUrl

// Whether an anchor href points at the same page as the post. A bare `#fragment`
// is inherently same-page; an absolute href counts only when it resolves to the
// same origin and path as `baseUrl` — guarding against a fragment that points to
// (or coincidentally matches) a section on a different page.
export const isSamePage = (
  href: string,
  baseUrl: string | undefined,
  resolveUrlFn: ResolveUrlFn,
): boolean => {
  if (href.startsWith('#')) {
    return true
  }

  if (!baseUrl) {
    return false
  }

  const resolvedHref = resolveUrlFn(href, baseUrl)
  const resolvedBase = resolveUrlFn(baseUrl, undefined)

  if (!resolvedHref || !resolvedBase) {
    return false
  }

  const target = parseUrl(resolvedHref)
  const base = parseUrl(resolvedBase)

  if (!target || !base) {
    return false
  }

  return target.origin === base.origin && target.pathname === base.pathname
}

// Priority: item link → site URL → feed URL. Item content is authored relative to the
// item's page, so its link is the best base for resolving relative URLs in content.
export const chooseBaseUrl = (
  itemUrl: string | null | undefined,
  siteUrl: string | null | undefined,
  feedUrl: string,
): string | undefined => {
  if (itemUrl && resolveUrl(itemUrl)) {
    return itemUrl
  }

  if (siteUrl) {
    const resolved = resolveUrl(siteUrl, feedUrl)

    if (resolved) {
      return resolved
    }
  }

  return resolveUrl(feedUrl)
}
