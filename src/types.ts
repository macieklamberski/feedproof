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
}

export type TransformContext = {
  baseUrl?: string
  enclosures?: Array<Enclosure>
  resolveEmbed?: (url: string) => EmbedResolverResult | undefined
  embedDomains?: Array<string>
}

export type DomTransform = (context: TransformContext) => (document: Document) => void

export type StringTransform = (context: TransformContext) => (html: string) => string
