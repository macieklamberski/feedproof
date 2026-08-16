import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { ResolveUrlFn } from '../types.js'

const urlShapeRegex = /[:/.]/

// Matches any URL that already carries a scheme (the URL-spec scheme grammar), so it is
// already absolute and resolution must leave it byte-identical. Protocol-relative URLs
// (`//host/path`) have no scheme and are intentionally not matched, so they resolve to
// the base URL's scheme. Shared with resolveRelativeUrls so both treat URLs identically.
export const absoluteUrlRegex = /^[a-z][a-z0-9+.-]*:/i

// Whether a URL names a media file of each kind, by extension, tolerating a query or
// fragment after it. Streaming manifests (.m3u8, .mpd) are deliberately absent from the
// video set: they play natively only in Safari, so a transform that promotes one produces
// a player that is broken everywhere else.
export const imageFileRegex = /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i
export const videoFileRegex = /\.(mp4|m4v|webm|mov|ogv)(\?|#|$)/i
export const audioFileRegex = /\.(mp3|m4a|ogg|oga|wav|flac|opus)(\?|#|$)/i

// A file no browser can play. Flash was blocked everywhere in January 2021, and hosts still
// serve the `.swf` bytes, so a URL that reaches this is one that answers 200 and renders
// nothing whatever a reader does with it.
export const flashFileRegex = /\.swf(\?|#|$)/i

// A real, loadable src, not empty and not the `about:blank` lazy placeholder.
export const isUsableSrc = (src: string | null): src is string => {
  const trimmed = src?.trim()

  return !!trimmed && trimmed !== 'about:blank'
}

// Rejects flag-style values like `"1"` / `"true"` / `"loaded"` that some lazy-loading
// libraries park on otherwise-lazy attribute names. A real URL carries a `:`, `/`, or `.`.
export const isUrlShaped = (value: string): boolean => {
  return urlShapeRegex.test(value)
}

// Parses the url and keeps it only when it sits on one of the hosts, exactly or on a subdomain,
// which is the check every resolver keyed on a platform makes before reading an id out of it.
// The base is what lets a protocol-relative url still name its host. A relative path lands on
// the placeholder host and fails the check, so a bare `/watch/123` never passes as the
// platform's own.
export const parseUrlOnHosts = (
  url: string | undefined,
  hosts: string | ReadonlyArray<string>,
): URL | undefined => {
  const parsed = url ? parseUrl(url, 'https://example.com') : undefined

  if (parsed && (isHostOf(parsed, hosts) || isSubdomainOf(parsed, hosts))) {
    return parsed
  }
}

// The same pick as `pickUrlParams`, for a query that arrives on its own rather than on a url,
// which is how a facade states its player options (`lite-youtube`'s `params`). Returns the pairs
// rather than a string, so a caller can override one from a dedicated attribute before building.
export const pickQueryParams = (
  query: string,
  names: ReadonlyArray<string>,
): Record<string, string> => {
  const parsed = new URLSearchParams(query)
  const picked: Record<string, string> = {}

  for (const name of names) {
    const value = parsed.get(name)

    if (value) {
      picked[name] = value
    }
  }

  return picked
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

// Resolves a relative URL against the base URL, keeping the original otherwise:
// an already-absolute/opaque URL, or a relative one that can't be resolved (no
// base). A placeholder URL is treated the same as a content URL: nothing is
// normalized and nothing is dropped.
// Overloaded so a definite URL returns a string (no undefined fallback needed at the
// call site). Only a possibly-undefined input widens the result. The cast is needed
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
// is inherently same-page. An absolute href counts only when it resolves to the
// same origin and path as `baseUrl`: guarding against a fragment that points to
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
