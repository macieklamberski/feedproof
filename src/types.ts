import type { DiscoverResolveUrlFn } from 'feedscout'

export type MaybePromise<T> = T | Promise<T>

export type Enclosure = {
  url: string
  type?: string
  medium?: string
}

export type ResolveUrlFn = DiscoverResolveUrlFn

export type EmbedResolverResult = {
  provider: string
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

export type EmbedResolver = {
  selector: string
  extract: (element: Element) => MaybePromise<EmbedResolverResult | undefined>
}

export type UrlUnwrapper = (url: URL) => string | undefined

export type TransformContext = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedResolvers: Array<EmbedResolver>
  lazySrcAttributes: Array<string>
  trackingHosts: Array<string>
  trackingPathSegments: Array<string>
  urlUnwrappers: Array<UrlUnwrapper>
  resolveUrlFn: ResolveUrlFn
}

export type DomTransform = (context: TransformContext) => (document: Document) => MaybePromise<void>

export type StringTransform = (context: TransformContext) => (html: string) => MaybePromise<string>

export type TransformContentOptions = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedResolvers?: Array<EmbedResolver>
  lazySrcAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  urlUnwrappers?: Array<UrlUnwrapper>
  resolveUrlFn?: ResolveUrlFn
  stringTransforms?: Array<StringTransform>
  domTransforms?: Array<DomTransform>
  finalStringTransforms?: Array<StringTransform>
}
