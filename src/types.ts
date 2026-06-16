import type { DiscoverResolveUrlFn } from 'feedscout'

export type MaybePromise<T> = T | Promise<T>

export type EnclosureThumbnail = {
  url: string
  width?: number
  height?: number
}

export type Enclosure = {
  url: string
  type?: string
  medium?: string
  width?: number
  height?: number
  duration?: number
  title?: string
  description?: string
  thumbnails?: Array<EnclosureThumbnail>
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

export type BookmarkResolverResult = {
  provider: string
  url: string
  title: string
  description?: string
  author?: string
  publisher?: string
  icon?: string
  thumbnail?: string
}

export type BookmarkResolver = {
  selector: string
  extract: (element: Element) => MaybePromise<BookmarkResolverResult | undefined>
}

export type CleanUrlFn = (url: string) => string

export type AssetType = 'image' | 'video' | 'audio'

export type AssetProxyFn = (url: string, type: AssetType) => string | undefined

// Highlights a code block's text for a known language, returning the highlighted
// inner HTML, or undefined when the highlighter does not know the language (the
// block then stays plain). Async so consumers can plug in an async highlighter.
export type HighlightFn = (text: string, language: string) => MaybePromise<string | undefined>

export type TransformContext = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedResolvers: Array<EmbedResolver>
  bookmarkResolvers: Array<BookmarkResolver>
  lazySrcAttributes: Array<string>
  lazySrcsetAttributes: Array<string>
  trackingHosts: Array<string>
  trackingPathSegments: Array<string>
  emojiImageHosts: Array<string>
  inertSelectors: Array<string>
  preservedPreClasses: Array<string>
  resolveUrlFn: ResolveUrlFn
  cleanUrlFn?: CleanUrlFn
  assetProxyFn?: AssetProxyFn
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
  enclosures?: Array<Enclosure>
  embedResolvers?: Array<EmbedResolver>
  bookmarkResolvers?: Array<BookmarkResolver>
  lazySrcAttributes?: Array<string>
  lazySrcsetAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  emojiImageHosts?: Array<string>
  inertSelectors?: Array<string>
  preservedPreClasses?: Array<string>
  resolveUrlFn?: ResolveUrlFn
  cleanUrlFn?: CleanUrlFn
  assetProxyFn?: AssetProxyFn
  enrichEmbedFn?: EnrichEmbedFn
  highlightFn?: HighlightFn
  articleTitle?: string
  stringTransforms?: Array<StringTransform>
  domTransforms?: Array<DomTransform>
}
