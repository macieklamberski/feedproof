import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { AssetType, ResolveUrlFn, TransformContext, UrlRole } from '../types.js'

// Each helper names the slice of the context it actually reads, so a caller holding only a
// cleaner can still reach the cleaning step, and a whole context satisfies either one.
type ResolveContext = Pick<TransformContext, 'resolveUrlFn' | 'baseUrl'>
type CleanContext = Pick<TransformContext, 'cleanUrlFn'>

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

// The two answers to a url that will not resolve. Which one a call site wants is a policy
// decision, so each one is a function with the answer in its name rather than something inferred
// from which helper happened to be reached for.
//
// What decides it is what the reader still sees once the url is refused, not whether the attribute
// happens to be a src. Written unresolved, `/watch/123` is a path on the reader's own origin, so
// the element points somewhere with nothing to do with the feed. That is worth refusing wherever
// something else renders in its place, and not worth it where refusing leaves nothing at all.
//
// Drop where the content survives without this url. A resolver result whose src is refused leaves
// its carrier for the generic tier, which places a placeholder anyway. A canonical url is refused
// on its own and the placeholder keeps every other field. An enclosure is one of a list.
//
// Keep where refusing deletes the last trace of something. A poster, an icon or an avatar decorates
// an element that renders regardless, and a picture that fails to load beats no element at all. A
// cite is mostly text and still reads with a dead link. The parked-media container in
// convertWidgets is the one src on this side of the line: the url lives in a `data-*` attribute no
// browser reads, so refusing it takes the media out of the item entirely, while keeping it leaves a
// player that at least says a video was here.
//
// Neither is the safety floor. `neutralizeUnsafeUrls` runs last over every url a placeholder
// carries and replaces a dangerous scheme with an inert sentinel, whichever of these wrote it.
// What it does not judge is whether a url resolves at all, which is why that is settled here.
//
// A pass that rewrites a url the publisher already wrote is not covered by any of this, which is
// why `resolveRelativeUrls` calls `resolveUrlFn` directly. It has no third option: the attribute
// is in the document either way, so it writes the resolved url or leaves the original alone.

// All three take the whole context rather than the two or three fields they read out of it. That
// is what keeps them composable at one line each, and it is what removed the wrapper that used to
// pair a resolve with a clean because writing the pair out was too noisy to repeat.

// Overloaded so a definite URL returns a string, with no undefined fallback needed at the call
// site. Only a possibly-undefined input widens the result.
type ResolveOrKeepUrl = {
  (url: string, context: ResolveContext): string
  (url: string | undefined, context: ResolveContext): string | undefined
}

// Resolves a relative URL against the base URL, keeping the original otherwise: an
// already-absolute/opaque URL, or a relative one that can't be resolved (no base). A placeholder
// URL is treated the same as a content URL: nothing is normalized and nothing is dropped. The
// cast is needed because the body's `string | undefined` doesn't satisfy the string-returning
// signature.
export const resolveOrKeepUrl: ResolveOrKeepUrl = ((url, context: ResolveContext) => {
  if (!url || absoluteUrlRegex.test(url)) {
    return url || undefined
  }

  return context.resolveUrlFn(url, context.baseUrl) ?? url
}) as ResolveOrKeepUrl

// The other answer, so a caller states which it wants by the name it calls. Takes an optional url,
// since a caller reading one out of markup or a payload has nothing to guard before asking, and
// trims first, since a whitespace-only attribute would otherwise resolve to the base url itself.
export const resolveOrDropUrl = (
  url: string | undefined,
  context: ResolveContext,
): string | undefined => {
  const trimmed = url?.trim()

  return trimmed ? context.resolveUrlFn(trimmed, context.baseUrl) : undefined
}

// Overloaded the same way and for the same reason as resolveOrKeepUrl: cleaning a definite url
// answers with a definite one, so composing the two keeps whichever answer the resolve step gave.
type CleanUrl = {
  (url: string, context: CleanContext): string
  (url: string | undefined, context: CleanContext): string | undefined
}

// The step after resolving. It carries no `orKeep` in its name because keeping is the only answer
// it has: a cleaner that answers with nothing has not answered, so the url it was handed stands.
// There is no drop counterpart and there is nothing for a caller to choose between, unlike the
// pair above, where the name is how a call site states its policy.
//
// No cleaner at all leaves the url unchanged, which is the same case as a cleaner answering with
// nothing. Passing an absent url straight through keeps the composition to one line.
export const cleanUrl: CleanUrl = ((url, context: CleanContext) => {
  return url ? context.cleanUrlFn?.(url) || url : undefined
}) as CleanUrl

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
