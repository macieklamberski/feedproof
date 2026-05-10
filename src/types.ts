import type { DiscoverResolveUrlFn } from 'feedscout'

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
  type?: 'video' | 'audio' | 'iframe'
  width?: number
  height?: number
  author?: string
  text?: string
}

export type EmbedResolver = {
  selector: string
  extract: (element: Element) => EmbedResolverResult | undefined
}

export type UrlUnwrapper = (url: URL) => string | undefined

export type TransformContext = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedResolvers?: Array<EmbedResolver>
  lazySrcAttributes?: Array<string>
  lazySrcsetAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  urlUnwrappers?: Array<UrlUnwrapper>
  resolveUrlFn?: ResolveUrlFn
}

export type DomTransform = (context: TransformContext) => (document: Document) => void

export type StringTransform = (context: TransformContext) => (html: string) => string

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
  stringTransforms?: Array<StringTransform>
  domTransforms?: Array<DomTransform>
  finalStringTransforms?: Array<StringTransform>
}
