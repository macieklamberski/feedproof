import type { DiscoverResolveUrlFn } from 'feedscout'

import type { MaybePromise } from 'trousse'

export type EnclosureThumbnail = {
  url: string
  width?: number
  height?: number
}

export type Enclosure = {
  url?: string
  type?: string
  medium?: string
  width?: number
  height?: number
  duration?: number
  title?: string
  description?: string
  thumbnails?: Array<EnclosureThumbnail>
  playerUrl?: string
  playerEmbed?: string
  isDefault?: boolean
  groupIndex?: number
}

export type ResolveUrlFn = DiscoverResolveUrlFn

export type EmbedResolverResult = {
  provider: string
  id?: string
  src: string
  url?: string
  thumbnail?: string
  width?: number
  height?: number
  // The shape the embed was inferred to have, as CSS spells it (`16/9`), for the case where
  // nothing states a size at all. It is the alternative to `width`/`height`, never a companion
  // to them: a real dimension is a measurement of this player, and a ratio only stands in for
  // one, so a placeholder carries the one or the other.
  ratio?: string
  title?: string
  description?: string
  author?: string
  avatar?: string
  publisher?: string
  date?: string
  duration?: number
}

// What the pipeline hands an enricher: the two attributes that name a placeholder's embed, and
// nothing else. The id must be enough to rebuild the platform's endpoint on its own, which is why
// TikTok's carries the handle beside the video id.
export type EmbedRef = { provider: string; id: string }

// Fills in the fields a resolver could not read off the markup, from the platform's own API. One
// call per document, every embed at once, so an implementation can batch, cache or dedupe as the
// platform allows.
//
// The answer is positional: one entry per embed sent, in the same order, the way `Promise.all`
// returns. An entry is whatever was found for that embed, or `undefined` for nothing, and the
// placeholder is then left as it was. Reassembling a batched response into input order is the
// implementation's job, since only it knows how it batched.
export type EnrichEmbedFn = (
  embeds: Array<EmbedRef>,
) => MaybePromise<Array<Partial<EmbedResolverResult> | undefined>>

export type EmbedResolver = {
  kind: 'embed'
  selector: string
  extract: (element: Element) => MaybePromise<EmbedResolverResult | undefined>
}

// A convention that parks an iframe's real URL in a `<div>` attribute and builds the iframe
// with JS at runtime: Pym.js (`data-pym-src`), @newswire/frames (`data-frame-src`) and the
// Drupal/CKEditor oEmbed convention (`data-oembed-url`). A reader runs no JS, so
// `rebuildDeferredIframes` materializes the iframe from `attribute` on each `selector` match.
export type DeferredIframeSource = {
  selector: string
  attribute: string
}

// The relationship a citation expresses toward the linked work. Sparse: only sources that
// carry a real relationship set it (today only microformats h-cite, via its `u-*-of` class).
// Every platform card leaves it unset, meaning a plain link preview with no relationship.
export type CiteKind = 'bookmark' | 'repost' | 'like' | 'reply' | 'read' | 'listen' | 'watch'

export type CiteResolverResult = {
  provider: string
  url: string
  title: string
  description?: string
  // The embedding author's own note about the link (e.g. a Ghost bookmark figcaption),
  // as opposed to `description`, which is the linked page's preview text.
  caption?: string
  author?: string
  publisher?: string
  // Whatever the card states, in whatever format it states it: an ISO timestamp where the
  // source carries one (Substack's JSON payload), a site-formatted string where it does not
  // (Cocoon renders the blog's own date setting, e.g. "2018.10.14"). So it is displayable
  // but not reliably parseable, and a resolver skips it rather than guessing when the card
  // shows only a partial date: dev.to's "Jul 14" carries no year to recover.
  date?: string
  icon?: string
  thumbnail?: string
  kind?: CiteKind
}

// What the pipeline hands a cite enricher. The url is what identifies the card: the provider names
// the platform the card was scraped from, not the linked page, so two cards from different
// platforms pointing at one url are the same cite. It stays in the payload because an
// implementation still dispatches on it.
export type CiteRef = { provider: string; url: string }

// Fills in the fields a card's markup does not carry (e.g. a Tumblr link block naming its poster by
// a media key that only Tumblr's own media service resolves). One call per document, every cite at
// once.
//
// The answer is positional: one entry per cite sent, in the same order, the way `Promise.all`
// returns, or `undefined` where nothing was found. Two placeholders citing one url arrive as two
// entries and expect two answers. An implementation that fetches each url once fills both slots
// from the one result.
export type EnrichCiteFn = (
  cites: Array<CiteRef>,
) => MaybePromise<Array<Partial<CiteResolverResult> | undefined>>

export type CiteResolver = {
  kind: 'cite'
  selector: string
  extract: (element: Element) => MaybePromise<CiteResolverResult | undefined>
}

// A platform that ships its own media as a container naming the file by an id, with no url anywhere
// in the markup, so the element renders as nothing until the id is turned into a url. The result is
// an ordinary <video>/<audio>, not an opaque placeholder, so the later media passes treat it as any
// other: dimensioned, proxied and deduplicated against the enclosures.
export type MediaResolverResult = {
  tag: 'video' | 'audio'
  src: string
  poster?: string
  width?: number
  height?: number
}

export type MediaResolver = {
  kind: 'media'
  selector: string
  extract: (element: Element) => MaybePromise<MediaResolverResult | undefined>
}

// One registry for every widget resolver. A resolver keeps a single honest contract (an
// EmbedResolver only ever returns embed results), and the kind tag is what lets each pass
// pick its own resolvers: convertCiteCards runs the cite ones early, before link and prose
// normalization can disturb card markup, while convertWidgets runs the embed and media ones
// late and discriminates on the result shape to emit either an opaque placeholder or a real
// media element.
export type WidgetResolver = EmbedResolver | MediaResolver | CiteResolver

export type WidgetResolverResult = EmbedResolverResult | MediaResolverResult | CiteResolverResult

export type CleanUrlFn = (url: string) => string

// The role a URL plays in the output, so safety policy and neutralization can differ:
// a `link` (anchor href) and a `media` URL (asset src) need different inert sentinels.
export type UrlRole = 'media' | 'link'

// Whether a URL is safe to emit for its role. Optional consumer policy (e.g. SSRF or a
// scheme allowlist). Feedsweep always enforces its own dangerous-scheme floor regardless.
export type IsSafeUrlFn = (url: string, type: UrlRole) => boolean

export type AssetType = 'image' | 'video' | 'audio'

export type AssetProxyFn = (url: string, type: AssetType) => MaybePromise<string | undefined>

// Normalizes a cite card's site-formatted display date (e.g. "2018.10.14") into the
// caller's preferred form. Returning undefined keeps the raw string verbatim, so an
// ambiguous or partial date stays displayed as the site wrote it.
export type ParseDateFn = (raw: string) => string | undefined

// Highlights a code block's text for a known language, returning the highlighted
// inner HTML, or undefined when the highlighter does not know the language (the
// block then stays plain). Async so consumers can plug in an async highlighter.
export type HighlightFn = (text: string, language: string) => MaybePromise<string | undefined>

export type TransformContext = {
  baseUrl?: string
  // Other URLs that also stand for this item's own page (e.g. the feed's site
  // page and feed URL, alongside the item permalink in `baseUrl`). Some feeds,
  // notably HTML-to-Atom bridges, absolutize in-page fragments against one of
  // these, not the permalink, so transforms that recognize self-page
  // links check these too. See `shortenSamePageLinkFragments`.
  sameSiteUrls?: Array<string>
  enclosures?: Array<Enclosure>
  widgetResolvers: Array<WidgetResolver>
  mediaSrcAttributes: Array<string>
  lazySrcAttributes: Array<string>
  lazySrcsetAttributes: Array<string>
  lazyIframeAttributes: Array<string>
  deferredIframeSources: Array<DeferredIframeSource>
  trackingHosts: Array<string>
  trackingPathSegments: Array<string>
  emojiImageHosts: Array<string>
  avatarImageHosts: Array<string>
  nonContentSelectors: Array<string>
  preservedPreClasses: Array<string>
  resolveUrlFn: ResolveUrlFn
  cleanUrlFn?: CleanUrlFn
  assetProxyFn?: AssetProxyFn
  isSafeUrlFn?: IsSafeUrlFn
  enrichEmbedFn?: EnrichEmbedFn
  enrichCiteFn?: EnrichCiteFn
  parseDateFn?: ParseDateFn
  highlightFn: HighlightFn
  articleTitle?: string
}

export type DomTransform = (context: TransformContext) => (document: Document) => MaybePromise<void>

export type StringTransform = (context: TransformContext) => (html: string) => MaybePromise<string>

export type ParseHtmlFn = (html: string) => MaybePromise<Document>

export type TransformContentOptions = {
  parseHtmlFn: ParseHtmlFn
  baseUrl?: string
  sameSiteUrls?: Array<string>
  enclosures?: Array<Enclosure>
  resolveUrlFn?: ResolveUrlFn
  cleanUrlFn?: CleanUrlFn
  assetProxyFn?: AssetProxyFn
  isSafeUrlFn?: IsSafeUrlFn
  enrichEmbedFn?: EnrichEmbedFn
  enrichCiteFn?: EnrichCiteFn
  parseDateFn?: ParseDateFn
  highlightFn?: HighlightFn
  articleTitle?: string
  stringTransforms?: Array<StringTransform>
  domTransforms?: Array<DomTransform>
  // Opt into the "best judgement" heuristic transforms (video-poster assignment, duplicate
  // enclosures and duplicate leading images). Ignored when `domTransforms` is set explicitly.
  heuristics?: boolean
}
