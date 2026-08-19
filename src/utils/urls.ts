import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { AssetType, ResolveUrlFn, UrlRole } from '../types.js'

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

// One attribute that can carry a url, on one element. Both passes that act on a url by its
// element and attribute, neutralizeUnsafeUrls and proxyAssetUrls, filter the table below for
// their own list, so an attribute is declared once and neither can quietly fall behind the
// other. resolveRelativeUrls deliberately stays out: it asks nothing of the tag.
export type UrlAttribute = {
  // Element carrying the attribute. Absent where any element can carry it: an embed or cite
  // placeholder parks its urls on data-* attributes of whatever element it replaced.
  tag?: string
  attribute: string
  // Safety class of the value, which picks the sentinel neutralizeUnsafeUrls swaps an unsafe
  // url for.
  role: UrlRole
  // Kind of asset proxyAssetUrls hands to the caller's proxy. `parent` reads the kind off the
  // element above, which is where a <source> or <track> says whether it belongs to a video or
  // an audio. Absent where the value is not an asset a proxy can serve.
  asset?: AssetType | 'parent'
}

// The url-carrying attributes of the whole pipeline. The tag-less rows come first: they are the
// embed and cite placeholder attributes, which sit on whatever element the placeholder replaced,
// so every pass reads them on every element it visits.
export const urlAttributes: Array<UrlAttribute> = [
  { attribute: 'data-embed-url', role: 'link' },
  { attribute: 'data-cite-url', role: 'link' },
  { attribute: 'formaction', role: 'link' },
  { attribute: 'data-embed-src', role: 'media' },
  { attribute: 'data-embed-thumbnail', role: 'media', asset: 'image' },
  { attribute: 'data-embed-avatar', role: 'media', asset: 'image' },
  { attribute: 'data-cite-icon', role: 'media', asset: 'image' },
  { attribute: 'data-cite-thumbnail', role: 'media', asset: 'image' },
  { tag: 'a', attribute: 'href', role: 'link' },
  { tag: 'img', attribute: 'src', role: 'media', asset: 'image' },
  { tag: 'img', attribute: 'srcset', role: 'media', asset: 'image' },
  { tag: 'video', attribute: 'src', role: 'media', asset: 'video' },
  { tag: 'video', attribute: 'poster', role: 'media', asset: 'image' },
  { tag: 'audio', attribute: 'src', role: 'media', asset: 'audio' },
  { tag: 'source', attribute: 'src', role: 'media', asset: 'parent' },
  { tag: 'source', attribute: 'srcset', role: 'media', asset: 'image' },
  { tag: 'track', attribute: 'src', role: 'media', asset: 'parent' },
  { tag: 'iframe', attribute: 'src', role: 'media' },
  { tag: 'embed', attribute: 'src', role: 'media' },
  { tag: 'object', attribute: 'data', role: 'media' },
  { tag: 'image', attribute: 'href', role: 'media', asset: 'image' },
]

// Keys the rows that name a tag by that tag, so a pass walking the DOM looks up an element's
// attributes by its local name instead of scanning the table. Tag-less rows are left out; a
// pass reads those on every element and filters for them separately.
export const groupUrlAttributesByTag = <Attribute extends UrlAttribute>(
  attributes: ReadonlyArray<Attribute>,
): Record<string, Array<Attribute>> => {
  const grouped: Record<string, Array<Attribute>> = {}

  for (const attribute of attributes) {
    if (attribute.tag) {
      grouped[attribute.tag] = [...(grouped[attribute.tag] ?? []), attribute]
    }
  }

  return grouped
}

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

// The same pick as `pickUrlParams`, for a query that arrives on its own, not on a url, which is
// how a facade states its player options (`lite-youtube`'s `params`). Returns the pairs instead
// of a string, so a caller can override one from a dedicated attribute before building.
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

// Overloaded so a definite URL returns a string, with no undefined fallback needed at the call
// site. Only a possibly-undefined input widens the result.
type ResolveOrKeepUrl = {
  (url: string, resolveUrlFn: ResolveUrlFn, baseUrl: string | undefined): string
  (
    url: string | undefined,
    resolveUrlFn: ResolveUrlFn,
    baseUrl: string | undefined,
  ): string | undefined
}

// Resolves a relative URL against the base URL, keeping the original otherwise: an
// already-absolute/opaque URL, or a relative one that can't be resolved (no base). A placeholder
// URL is treated the same as a content URL: nothing is normalized and nothing is dropped. The
// cast is needed because the body's `string | undefined` doesn't satisfy the string-returning
// signature.
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
