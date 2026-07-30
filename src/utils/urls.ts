import { resolveUrl } from 'feedcanon'
import { parseUrl } from 'trousse'
import type { ResolveUrlFn } from '../types.js'

// Matches any URL that already carries a scheme (the URL-spec scheme grammar) — i.e.
// already absolute, so resolution must leave it byte-identical. Protocol-relative URLs
// (`//host/path`) have no scheme and are intentionally not matched, so they resolve to
// the base URL's scheme. Shared with resolveRelativeUrls so both treat URLs identically.
const urlShapeRegex = /[:/.]/

export const absoluteUrlRegex = /^[a-z][a-z0-9+.-]*:/i

// A real, loadable src — not empty and not the `about:blank` lazy placeholder.
export const isUsableSrc = (src: string | null): src is string => {
  const trimmed = src?.trim()

  return !!trimmed && trimmed !== 'about:blank'
}

// Rejects flag-style values like `"1"` / `"true"` / `"loaded"` that some lazy-loading
// libraries park on otherwise-lazy attribute names; a real URL carries a `:`, `/`, or `.`.
export const isUrlShaped = (value: string): boolean => {
  return urlShapeRegex.test(value)
}

// The query string an embed resolver carries over when it rebuilds a src from the video id:
// only the parameters that change what plays. Returns it ready to append, so a src with
// nothing worth keeping stays bare.
export const pickUrlParams = (url: string, names: ReadonlyArray<string>): string => {
  const params = parseUrl(url)?.searchParams

  if (!params) {
    return ''
  }

  const kept = new URLSearchParams()

  for (const name of names) {
    const value = params.get(name)

    if (value) {
      kept.set(name, value)
    }
  }

  const query = kept.toString()

  return query ? `?${query}` : ''
}

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

// An already-absolute http(s) URL, with no repair attempted. Every other candidate is meant
// to be a URL and merely arrives malformed, so `resolveUrl`'s repairs are right for them. A
// GUID is only sometimes a URL at all, and repairing it would add a scheme to `12345` or
// `example.com` and make the result the base for the whole item.
const strictHttpUrl = (value: string): string | undefined => {
  const parsed = parseUrl(value)

  if (parsed?.protocol !== 'http:' && parsed?.protocol !== 'https:') {
    return
  }

  return parsed.href
}

// Priority: declared xml:base → item link → item GUID → site URL → feed URL. Item content is
// authored relative to the item's page, so its link is the best base for resolving relative
// URLs in content — but an explicit xml:base outranks it, being the spec-correct base URI for
// relative references (Atom RFC 4287 §2, RFC 3986 §5.1.1). Item-level xml:base inherits from
// channel-level, which resolves against the document URI, i.e. the feed URL.
//
// An empty-string xml:base is a declaration per W3C XML Base — it resolves to the parent's
// base, effectively a reset — so it is told apart from "not declared" by an explicit null
// check rather than by falsiness.
//
// The GUID is a base only when it is URL-shaped, which is common: an Atom <id> is often an
// IRI and an RSS <guid isPermaLink="true"> is a URL by definition. It is the one candidate
// read strictly, for the reason given at strictHttpUrl.
export const chooseBaseUrl = (
  itemUrl: string | null | undefined,
  siteUrl: string | null | undefined,
  feedUrl: string,
  xmlBase?: { channel?: string | null; item?: string | null },
  itemGuid?: string | null,
): string | undefined => {
  if (xmlBase?.channel != null || xmlBase?.item != null) {
    const channelBase =
      xmlBase.channel != null ? resolveUrl(xmlBase.channel, feedUrl) : resolveUrl(feedUrl)

    if (xmlBase.item != null) {
      const itemBase = channelBase
        ? resolveUrl(xmlBase.item, channelBase)
        : resolveUrl(xmlBase.item)

      if (itemBase) {
        return itemBase
      }
    }

    if (channelBase) {
      return channelBase
    }
  }

  if (itemUrl && resolveUrl(itemUrl)) {
    return itemUrl
  }

  if (itemGuid) {
    const guidAsUrl = strictHttpUrl(itemGuid)

    if (guidAsUrl) {
      return guidAsUrl
    }
  }

  if (siteUrl) {
    const resolved = resolveUrl(siteUrl, feedUrl)

    if (resolved) {
      return resolved
    }
  }

  return resolveUrl(feedUrl)
}
