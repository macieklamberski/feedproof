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

export type UrlUnwrapper = (url: URL) => string | undefined

export type AssetType = 'image' | 'video' | 'audio'

export type AssetProxyFn = (url: string, type: AssetType) => string | undefined

export type TransformContext = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedResolvers: Array<EmbedResolver>
  lazySrcAttributes: Array<string>
  lazySrcsetAttributes: Array<string>
  trackingHosts: Array<string>
  trackingPathSegments: Array<string>
  urlUnwrappers: Array<UrlUnwrapper>
  resolveUrlFn: ResolveUrlFn
  assetProxyFn?: AssetProxyFn
  enrichEmbedFn?: EnrichEmbedFn
  articleTitle?: string
}

export type DomTransform = (context: TransformContext) => (document: Document) => MaybePromise<void>

export type StringTransform = (context: TransformContext) => (html: string) => MaybePromise<string>

export type TransformContentOptions = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedResolvers?: Array<EmbedResolver>
  lazySrcAttributes?: Array<string>
  lazySrcsetAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  urlUnwrappers?: Array<UrlUnwrapper>
  resolveUrlFn?: ResolveUrlFn
  assetProxyFn?: AssetProxyFn
  enrichEmbedFn?: EnrichEmbedFn
  articleTitle?: string
  stringTransforms?: Array<StringTransform>
  domTransforms?: Array<DomTransform>
  finalStringTransforms?: Array<StringTransform>
}
