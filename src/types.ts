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
  autoload?: boolean
  width?: number
  height?: number
  author?: string
  text?: string
}

export type EmbedPlatformHandler = {
  selector: string
  extract: (element: Element) => EmbedResolverResult | undefined
}

export type RedirectExtractor = (url: URL) => string | null

export type TransformContext = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedHandlers?: Array<EmbedPlatformHandler>
  lazySrcAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  redirectExtractors?: Array<RedirectExtractor>
}

export type DomTransform = (context: TransformContext) => (document: Document) => void

export type StringTransform = (context: TransformContext) => (html: string) => string

export type TransformToggles = {
  stripOrphanedClosingTags?: boolean
  decodeDoubleEncodedTags?: boolean
  unwrapWrappers?: boolean
  paragraphizePlainText?: boolean
  stripEmptyTags?: boolean
  fixLazyImages?: boolean
  resolveRelativeUrls?: boolean
  unwrapRedirectUrls?: boolean
  stripTrackingParams?: boolean
  removeTrackingPixels?: boolean
  stripInterBlockBreaks?: boolean
  simplifyFigures?: boolean
  highlightCode?: boolean
  mergeConsecutiveOneLinerPres?: boolean
  replacePreLineBreaks?: boolean
  trimPreWhitespace?: boolean
  linkifyUrls?: boolean
  replaceEmbedsWithPlaceholders?: boolean
  injectEnclosureEmbedPlaceholders?: boolean
}

export type TransformContentOptions = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  embedHandlers?: Array<EmbedPlatformHandler>
  lazySrcAttributes?: Array<string>
  trackingHosts?: Array<string>
  trackingPathSegments?: Array<string>
  redirectExtractors?: Array<RedirectExtractor>
  transforms?: TransformToggles
}
