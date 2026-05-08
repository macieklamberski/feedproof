export type Enclosure = {
  url: string
  type?: string
  medium?: string
}

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

export type EmbedHandler = {
  selector: string
  extract: (element: Element) => EmbedResolverResult | undefined
}

export type RedirectExtractor = (url: URL) => string | null

export type TransformContext = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedHandlers?: Array<EmbedHandler>
  lazySrcAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  redirectExtractors?: Array<RedirectExtractor>
}

export type DomTransform = (context: TransformContext) => (document: Document) => void

export type StringTransform = (context: TransformContext) => (html: string) => string

export type TransformContentOptions = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedHandlers?: Array<EmbedHandler>
  lazySrcAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  redirectExtractors?: Array<RedirectExtractor>
  stringTransforms?: Array<StringTransform>
  domTransforms?: Array<DomTransform>
  finalStringTransforms?: Array<StringTransform>
}
