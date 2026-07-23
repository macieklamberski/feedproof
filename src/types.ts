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
  title?: string
  description?: string
  author?: string
  avatar?: string
  duration?: number
}

export type EnrichEmbedFn = (
  embeds: Array<{ provider: string; id: string }>,
) => MaybePromise<Map<string, Partial<EmbedResolverResult>>>

export type EmbedResolver = {
  selector: string
  extract: (element: Element) => MaybePromise<EmbedResolverResult | undefined>
}

// A convention that parks an iframe's real URL in a `<div>` attribute and builds the iframe
// with JS at runtime — Pym.js (`data-pym-src`) and @newswire/frames (`data-frame-src`) are the
// two seen in the wild. A reader runs no JS, so `rebuildDeferredIframes` materializes the iframe
// from `attribute` on each `selector` match.
export type DeferredIframeSource = {
  selector: string
  attribute: string
}

// The relationship a citation expresses toward the linked work. Sparse: only sources that
// carry a real relationship set it (today just microformats h-cite, via its `u-*-of` class);
// every platform card leaves it unset, meaning a plain link preview with no relationship.
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
  // shows only a partial date — dev.to's "Jul 14" carries no year to recover.
  date?: string
  icon?: string
  thumbnail?: string
  kind?: CiteKind
}

export type CiteResolver = {
  selector: string
  extract: (element: Element) => MaybePromise<CiteResolverResult | undefined>
}

export type CleanUrlFn = (url: string) => string

// The role a URL plays in the output, so safety policy and neutralization can differ:
// a `link` (anchor href) and a `media` URL (asset src) need different inert sentinels.
export type UrlRole = 'media' | 'link'

// Whether a URL is safe to emit for its role. Optional consumer policy (e.g. SSRF or a
// scheme allowlist); feedsweep always enforces its own dangerous-scheme floor regardless.
export type IsSafeUrlFn = (url: string, type: UrlRole) => boolean

export type AssetType = 'image' | 'video' | 'audio'

export type AssetProxyFn = (url: string, type: AssetType) => string | undefined

// Highlights a code block's text for a known language, returning the highlighted
// inner HTML, or undefined when the highlighter does not know the language (the
// block then stays plain). Async so consumers can plug in an async highlighter.
export type HighlightFn = (text: string, language: string) => MaybePromise<string | undefined>

export type TransformContext = {
  baseUrl?: string
  // Other URLs that also stand for this item's own page (e.g. the feed's site
  // page and feed URL, alongside the item permalink in `baseUrl`). Some feeds,
  // notably HTML-to-Atom bridges, absolutize in-page fragments against one of
  // these rather than the permalink, so transforms that recognize self-page
  // links check these too. See `shortenSamePageLinkFragments`.
  sameSiteUrls?: Array<string>
  enclosures?: Array<Enclosure>
  embedResolvers: Array<EmbedResolver>
  citeResolvers: Array<CiteResolver>
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
  embedResolvers?: Array<EmbedResolver>
  citeResolvers?: Array<CiteResolver>
  lazySrcAttributes?: Array<string>
  lazySrcsetAttributes?: Array<string>
  lazyIframeAttributes?: Array<string>
  deferredIframeSources?: Array<DeferredIframeSource>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  emojiImageHosts?: Array<string>
  avatarImageHosts?: Array<string>
  nonContentSelectors?: Array<string>
  preservedPreClasses?: Array<string>
  resolveUrlFn?: ResolveUrlFn
  cleanUrlFn?: CleanUrlFn
  assetProxyFn?: AssetProxyFn
  isSafeUrlFn?: IsSafeUrlFn
  enrichEmbedFn?: EnrichEmbedFn
  highlightFn?: HighlightFn
  articleTitle?: string
  stringTransforms?: Array<StringTransform>
  domTransforms?: Array<DomTransform>
  // Opt into the "best judgement" heuristic transforms (enclosure-duplicate and
  // video-poster stripping). Ignored when `domTransforms` is set explicitly.
  heuristics?: boolean
}
