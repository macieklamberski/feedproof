import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { AssetType, ResolveUrlFn, TransformContext, UrlRole } from '../types.js'

// Each helper names the slice of the context it actually reads, so a caller holding only a
// cleaner can still reach the cleaning step, and a whole context satisfies either one.
type ResolveContext = Pick<TransformContext, 'resolveUrlFn' | 'baseUrl'>
type CleanContext = Pick<TransformContext, 'cleanUrlFn'>

// A base for parsing a url that may name no host of its own, which is what a url read out of a
// query value or a JSON attribute often is. Which host it names never reaches the output: a
// caller reads the path, the query, or the host the url itself supplied, so any resolvable url
// serves.
export const placeholderBaseUrl = 'https://example.com'

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
export const audioFileRegex = /\.(aac|mp3|m4a|ogg|oga|wav|flac|opus)(\?|#|$)/i

// A file no browser can play. Flash was blocked everywhere in January 2021, and hosts still
// serve the `.swf` bytes, so a URL that reaches this is one that answers 200 and renders
// nothing whatever a reader does with it.
export const flashFileRegex = /\.swf(\?|#|$)/i

export const documentFileRegex = /\.(pdf|epub|docx?|pptx?|xlsx?)(\?|#|$)/i

// Whether a url names audio or video the reader can play as it stands. A podcast host serves the
// episode file from the same domain as its player, so a media url that skips this check reads as
// a player id and the enclosure loses its audio element to a placeholder.
export const isMediaFile = (value: string): boolean => {
  return audioFileRegex.test(value) || videoFileRegex.test(value)
}

// Whether a value names a file of any kind the reader can already show. The enclosure probe offers
// every attachment a feed carries to every resolver, so a platform whose id shape admits a dot
// would otherwise mint a player for an `.mp3` and take the place of a playable element.
export const isFileName = (value: string): boolean => {
  return (
    documentFileRegex.test(value) ||
    audioFileRegex.test(value) ||
    videoFileRegex.test(value) ||
    imageFileRegex.test(value)
  )
}

// The RFC 4122 form, which four platforms name an episode, a show or an upload by. It is not a
// bet on a platform's current id length the way a measured band is, because the shape is fixed
// by the spec rather than by whoever mints them, and Simplecast leans on the exactness: it is
// what tells the current id space from the legacy eight hex characters, so a looser class would
// read a legacy id as a current one and speak it to the wrong host.
export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// One attribute carrying one url, on one element. The two passes that act on a url by its element
// and attribute, neutralizeUnsafeUrls and proxyAssetUrls, filter the table below for their own
// list, so an attribute is declared once and neither can quietly fall behind the other.
//
// Two passes and no more. resolveRelativeUrls stays out because it asks nothing of the tag: it
// matches `src` on any element at all, which several widget resolvers rely on to reach a
// `script[src]` carrier, and it keeps its own list. `srcset` stays out because it is not one url
// but a list of them: both passes rewrite the whole attribute, and each does so on terms this
// table cannot state, neutralizeUnsafeUrls dropping the unsafe candidates and proxyAssetUrls
// rewriting only when the proxy changed one.
export type UrlAttribute = {
  // Element carrying the attribute. Absent where any element can carry it: an embed or cite
  // placeholder parks its urls on data-* attributes of whatever element it replaced.
  tag?: string
  attribute: string
  // Safety class of the value, which picks the sentinel neutralizeUnsafeUrls swaps an unsafe
  // url for.
  role: UrlRole
  // Kind of asset proxyAssetUrls hands to the caller's proxy, absent where the value is not an
  // asset a proxy can serve. This is the only place that distinction is written down.
  //
  // `fromParent` is not a kind but the instruction to go and find one: a <source> or <track> is a
  // video track inside a <video> and an audio one inside an <audio>, so nothing about the row
  // itself can answer, and only the pass, holding the element, can.
  asset?: AssetType | 'fromParent'
}

// The url-carrying attributes of the two passes. The tag-less rows come first: they are the embed
// and cite placeholder attributes, which sit on whatever element the placeholder replaced, so a
// pass reads them on every element it visits.
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
  { tag: 'form', attribute: 'action', role: 'link' },
  { tag: 'img', attribute: 'src', role: 'media', asset: 'image' },
  { tag: 'video', attribute: 'src', role: 'media', asset: 'video' },
  { tag: 'video', attribute: 'poster', role: 'media', asset: 'image' },
  { tag: 'audio', attribute: 'src', role: 'media', asset: 'audio' },
  { tag: 'source', attribute: 'src', role: 'media', asset: 'fromParent' },
  { tag: 'track', attribute: 'src', role: 'media', asset: 'fromParent' },
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
): ReadonlyMap<string, Array<Attribute>> => {
  const grouped = new Map<string, Array<Attribute>>()

  for (const attribute of attributes) {
    if (attribute.tag) {
      grouped.set(attribute.tag, [...(grouped.get(attribute.tag) ?? []), attribute])
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

// A url sits on one of the hosts when it is that host exactly or a subdomain of it. The pair is
// the whole question every host-keyed resolver asks, and half of it silently claims too little.
export const isOnHosts = (url: string | URL, hosts: string | ReadonlyArray<string>): boolean => {
  return isHostOf(url, hosts) || isSubdomainOf(url, hosts)
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
  const parsed = url ? parseUrl(url, placeholderBaseUrl) : undefined

  if (parsed && isOnHosts(parsed, hosts)) {
    return parsed
  }
}

// A path segment arrives with its percent-encoding intact, unlike a query value, which
// `searchParams` decodes on read — so only path-reading extraction needs this. A malformed
// escape decodes to nothing usable and is refused rather than thrown.
export const decodeSegment = (segment: string | undefined): string | undefined => {
  try {
    return segment === undefined ? undefined : decodeURIComponent(segment)
  } catch {}
}

// Decodes a percent-encoded value, handing back the raw text when the escape is malformed, for a
// field the undecoded form still reads as. A falsy value returns undefined, since
// decodeURIComponent answers the string "undefined" for a missing one.
export const decodeOrKeep = (value: string | undefined): string | undefined => {
  if (!value) {
    return
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// A Flash-era player took its options with `&` and no `?`, so `{id}&autoplay=1` arrives as one
// path segment. The head is the id the platform's own client reads out of it; whether the tail
// is carried into the minted query or dropped is each platform's own call, decided by what its
// player's query selects.
export const splitStrayParams = (segment: string): { head: string; strayParams: string } => {
  const [head = '', ...rest] = segment.split('&')

  return { head, strayParams: rest.join('&') }
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

// The other half of `pickQueryParams`: the pairs it returns, back into a query ready to append.
// A resolver that has nothing to carry over gets an empty string, so its src stays bare rather
// than ending on a lone `?`.
export const composeQuery = (params?: Record<string, string>): string => {
  const query = new URLSearchParams(params).toString()

  return query ? `?${query}` : ''
}

// The query string an embed resolver carries over when it rebuilds a src from the video id:
// only the parameters that change what plays. Returns it ready to append, so a src with
// nothing worth keeping stays bare.
export const pickUrlParams = (url: string, names: ReadonlyArray<string>): string => {
  return composeQuery(pickQueryParams(parseUrl(url)?.search ?? '', names))
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
