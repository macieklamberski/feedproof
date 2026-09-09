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
  ratio?: string
  title?: string
  description?: string
  author?: string
  avatar?: string
  publisher?: string
  date?: string
  duration?: number
}

export type EmbedRenderHint = {
  provider: string
  // The origin the player's messages arrive from, for a reader to check `event.origin` against.
  // Absent where the player is served from the publisher's own host, a Mastodon instance or a
  // Podigee show, and the frame's own origin is the one to match.
  origin?: string
  // Query parameters the player wants on every load, not only the one after a click. A reader
  // sets each over whatever the placeholder's url carries. They stay off the url itself, since a
  // reader that draws the frame differently, or draws none, should not be handed them.
  params?: Record<string, string>
  // Query parameters that start playback, for a load that follows a person's click. They never
  // go on the placeholder's url, since a placeholder must not start on page load.
  autoplayParams?: Record<string, string>
  isReady?: (data: unknown) => boolean
  // Posted once: a second post pauses a player whose play command toggles.
  requestPlay?: unknown
  requestHeight?: unknown
  // A social post has no height until it renders, so the frame posts one and the reader sizes
  // the box from it.
  readHeight?: (data: unknown) => number | undefined
}

// What the pipeline hands an enricher: the two attributes that name a placeholder's embed, and
// nothing else. The id must be enough to rebuild the platform's endpoint on its own, which is why
// TikTok's carries the handle beside the video id.
export type EmbedRef = { provider: string; id: string }

// Positional: one entry per embed sent, in the same order, undefined where nothing was found.
export type EnrichEmbedFn = (
  embeds: Array<EmbedRef>,
) => MaybePromise<Array<Partial<EmbedResolverResult> | undefined>>

export type EmbedResolver = {
  kind: 'embed'
  selector: string
  extract: (element: Element) => MaybePromise<EmbedResolverResult | undefined>
}

// A `<div>` attribute holding the url an iframe is built from at runtime: Pym.js `data-pym-src`,
// @newswire/frames `data-frame-src` and Drupal's oEmbed `data-oembed-url`.
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
  // An ISO timestamp where the card carries one, Substack's JSON payload, and the site's display
  // string elsewhere: Cocoon writes "2018.10.14" and dev.to "Jul 14" with no year.
  date?: string
  icon?: string
  thumbnail?: string
  kind?: CiteKind
}

export type CiteRef = { provider: string; url: string }

// Fills in the fields a card's markup does not carry, such as a Tumblr poster named by a media key.
// Positional: one entry per cite sent, in the same order, and a url cited twice gets two entries.
export type EnrichCiteFn = (
  cites: Array<CiteRef>,
) => MaybePromise<Array<Partial<CiteResolverResult> | undefined>>

export type CiteResolver = {
  kind: 'cite'
  selector: string
  extract: (element: Element) => MaybePromise<CiteResolverResult | undefined>
}

export type MediaResolverResult = {
  tag: 'video' | 'audio'
  src: string
  title?: string
  poster?: string
  width?: number
  height?: number
}

// A platform that ships its own media as a container naming the file by an id, with no url in
// the markup.
export type MediaResolver = {
  kind: 'media'
  selector: string
  extract: (element: Element) => MaybePromise<MediaResolverResult | undefined>
}

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
  // The site page and the feed url, which also stand for the item's page: an HTML-to-Atom bridge
  // absolutizes in-page fragments against one of these, not the permalink.
  sameSiteUrls?: Array<string>
  // The feed's logo, icon and cover, which an enclosure repeats as decoration.
  feedImageUrls?: Array<string>
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
  feedImageUrls?: Array<string>
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
