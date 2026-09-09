import { type MaybePromise, trimObject } from 'trousse'
import type {
  CiteResolverResult,
  EmbedResolver,
  EmbedResolverResult,
  MediaResolver,
  MediaResolverResult,
  ParseDateFn,
  TransformContext,
  WidgetResolver,
  WidgetResolverResult,
} from '../types.js'
import {
  type GeneratedWrapperType,
  getElementDimensions,
  getPairRatio,
  getStylePairRatio,
  getWrapperRatio,
} from './dom.js'
import { cleanUrl, isOnHosts, resolveOrDropUrl, resolveOrKeepUrl } from './urls.js'

const parseOrKeepDate = (
  date: string | undefined,
  parseDateFn: ParseDateFn | undefined,
): string | undefined => {
  return date ? (parseDateFn?.(date) ?? date) : undefined
}

const leadingAtRegex = /^@+/

// An account name in the display form the platform itself writes, for the platforms whose own
// naming carries the sigil. Only a leading run is stripped, so a full Mastodon handle keeps the
// `@` that separates its instance. On a platform that writes bare names it invents a handle.
export const atUsername = (name: string): string => {
  return `@${name.replace(leadingAtRegex, '')}`
}

const embedCarriers: Record<string, string> = {
  iframe: 'src',
  embed: 'src',
  object: 'data',
}

// Legacy Flash markup nests an `<embed>` inside an `<object>`, and both match: the outer wins
// by document order and takes the inner with it.
export const embedCarrierSelector = Object.entries(embedCarriers)
  .map(([tag, attribute]) => `${tag}[${attribute}]`)
  .join(', ')

export const readCarrierUrl = (element: Element): string => {
  return element.getAttribute(embedCarriers[element.localName] ?? 'src') ?? ''
}

type ResolverOptions = {
  // Scribd states `height="500"` on every document and keeps the ratio in `data-aspect-ratio`.
  preferResolverSize?: boolean
}

// A resolver whose selector names the platform's own markup.
export const createMarkupEmbedResolver = (
  selector: string,
  extract: (element: Element) => EmbedResolverResult | undefined,
  options: ResolverOptions = {},
): EmbedResolver => {
  return {
    kind: 'embed',
    selector,
    extract: (element) => {
      return decideSize(element, extract(element), options.preferResolverSize)
    },
  }
}

// What a carrier says about its size: the dimensions it declares, or the ratio a responsive
// wrapper implies when it declares none. Never both, which is the rule the placeholder carries too.
type EmbedSize = Pick<EmbedResolverResult, 'width' | 'height' | 'ratio'>

// A zero is not a claim: `width="0"` once took the size slot off a resolver and wrote nothing.
type SizeFields = { width?: unknown; height?: unknown; ratio?: unknown }

const hasDimensions = (size: SizeFields): boolean => {
  return !!size.width || !!size.height
}

const hasSize = (size: SizeFields): boolean => {
  return hasDimensions(size) || size.ratio !== undefined
}

const decideSize = (
  element: Element,
  result: EmbedResolverResult | undefined,
  preferResolverSize?: boolean,
): EmbedResolverResult | undefined => {
  if (!result) {
    return
  }

  if (preferResolverSize && hasSize(result)) {
    return result
  }

  // Ancestors are read only with no resolver size: a theme's 16:9 wrapper once beat a 9:16 player.
  const wrapperDepth = hasSize(result) ? 0 : undefined
  const declared = getEmbedSize(element, wrapperDepth)

  // A lone width reserves no space, so it never outranks a resolver's ratio or height.
  const loneWidth = !!declared.width && !declared.height && !declared.ratio

  if (!hasSize(declared) || (loneWidth && hasSize(result))) {
    return result
  }

  // Never merged: a publisher's width beside a resolver's height is a box nobody measured.
  const { width: _width, height: _height, ratio: _ratio, ...rest } = result

  return { ...rest, ...declared }
}

export const getEmbedSize = (element: Element, wrapperDepth?: number): EmbedSize => {
  const shapeRatio = getStylePairRatio(element)

  if (shapeRatio) {
    return { ratio: shapeRatio }
  }

  const dimensions = getElementDimensions(element)

  const pairRatio = getPairRatio(dimensions.width, dimensions.height)

  if (pairRatio) {
    return { ratio: pairRatio }
  }

  // `width="0" height="360"` claims a height only, and Flickr renders nothing for a zero width.
  const size = trimObject(dimensions, Boolean)

  if (size) {
    return size
  }

  const ratio = getWrapperRatio(element, wrapperDepth)

  return ratio ? { ratio } : {}
}

// The write side of getEmbedSize: a size onto an element as real HTML attributes, each half only
// where it exists, since a fluid-width player states a height and nothing else.
export const setDimensions = (
  element: Element,
  size: Pick<EmbedResolverResult, 'width' | 'height'>,
): void => {
  if (size.width) {
    element.setAttribute('width', String(size.width))
  }

  if (size.height) {
    element.setAttribute('height', String(size.height))
  }
}

// An iframe's `title` is the one field a publisher's snippet states that the url does not carry.
export const createUrlEmbedResolver = (
  hosts: Array<string>,
  extract: (url: string, element: Element) => EmbedResolverResult | undefined,
  options: ResolverOptions = {},
): EmbedResolver => {
  return {
    kind: 'embed',
    selector: embedCarrierSelector,
    extract: (element) => {
      const src = readCarrierUrl(element)

      if (!isOnHosts(src, hosts)) {
        return
      }

      return decideSize(element, extract(src, element), options.preferResolverSize)
    },
  }
}

export const isEmbedOrMediaResolver = (
  resolver: WidgetResolver,
): resolver is EmbedResolver | MediaResolver => {
  return resolver.kind === 'embed' || resolver.kind === 'media'
}

export const isMediaResult = (result: WidgetResolverResult): result is MediaResolverResult => {
  return 'tag' in result
}

// Not used by the injectEnclosures probe: anything set here would change what every resolver sees.
export const createIframe = (document: Document, src: string): HTMLElement => {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('src', src)

  return iframe
}

// The one native player every pass mints, whether the media came out of the markup or out of an
// enclosure. The poster and the dimensions are written only on video, which is the only tag they
// are valid on. Urls arrive resolved: a caller knows what its own source is relative to.
export const createMediaElement = (
  document: Document,
  result: MediaResolverResult,
): HTMLElement => {
  const media = document.createElement(result.tag)
  media.setAttribute('src', result.src)
  media.setAttribute('controls', '')

  if (result.tag === 'video') {
    if (result.poster) {
      media.setAttribute('poster', result.poster)
    }

    setDimensions(media, result)
  }

  return media
}

// What every image the pipeline mints states about itself.
type ImageFields = {
  src: string
  srcset?: string
  alt?: string
  width?: number
  height?: number
}

export const createImage = (document: Document, fields: ImageFields): HTMLElement => {
  const image = document.createElement('img')
  image.setAttribute('src', fields.src)

  if (fields.srcset) {
    image.setAttribute('srcset', fields.srcset)
  }

  if (fields.alt) {
    image.setAttribute('alt', fields.alt)
  }

  setDimensions(image, fields)

  return image
}

// A platform that publishes a canonical static render of something it would otherwise show in a
// player: Datawrapper's chart png, Giphy's gif. The render goes inline where a reader sees it at
// once, and the interactive version stays one click away on the platform's own page.
export const createLinkedImage = (
  document: Document,
  fields: ImageFields & { href: string },
): HTMLElement => {
  const link = document.createElement('a')
  link.setAttribute('href', fields.href)
  link.appendChild(createImage(document, fields))

  return link
}

export const updatePlaceholder = <Type extends object>(
  element: Element,
  type: GeneratedWrapperType,
  fields: Type,
): void => {
  // Trimming here lets resolvers pass extracted text as-is. A value that is only
  // whitespace trims to an empty string and is skipped with the other empty fields.
  for (const [key, value] of Object.entries(fields)) {
    const name = `data-${type}-${key}`
    const cleaned = typeof value === 'string' ? value.trim() : value

    if (cleaned) {
      element.setAttribute(name, cleaned)
    }
  }
}

export const createPlaceholder = <Type extends object>(
  document: Document,
  type: GeneratedWrapperType,
  fields: Type,
): HTMLElement => {
  const element = document.createElement('div')
  updatePlaceholder(element, type, fields)

  return element
}

// Key order is the attribute write order.
export const normalizeEmbedFields = (
  metadata: Partial<EmbedResolverResult>,
): Record<string, string | undefined> => {
  return {
    src: metadata.src,
    provider: metadata.provider,
    id: metadata.id,
    url: metadata.url,
    thumbnail: metadata.thumbnail,
    width: metadata.width ? String(metadata.width) : undefined,
    height: metadata.height ? String(metadata.height) : undefined,
    ratio: metadata.ratio,
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    avatar: metadata.avatar,
    publisher: metadata.publisher,
    date: metadata.date,
    duration: metadata.duration ? String(metadata.duration) : undefined,
  }
}

// The size slot is cleared whole: an enricher's width once sat beside a resolver's height.
export const updateEmbedPlaceholder = (
  element: Element,
  metadata: Partial<EmbedResolverResult>,
): void => {
  const fields = normalizeEmbedFields(metadata)

  if (hasSize(fields)) {
    element.removeAttribute('data-embed-width')
    element.removeAttribute('data-embed-height')
    element.removeAttribute('data-embed-ratio')
  }

  if (hasDimensions(fields)) {
    fields.ratio = undefined
  }

  updatePlaceholder(element, 'embed', fields)
}

// The src is never cleaned: a player src carries query the platform needs.
export const prepareEmbedMetadata = (
  metadata: Partial<EmbedResolverResult>,
  context: TransformContext,
): Partial<EmbedResolverResult> => {
  return {
    ...metadata,
    src: resolveOrDropUrl(metadata.src, context),
    url: cleanUrl(resolveOrDropUrl(metadata.url, context), context),
    thumbnail: resolveOrKeepUrl(metadata.thumbnail, context),
    avatar: resolveOrKeepUrl(metadata.avatar, context),
    date: parseOrKeepDate(metadata.date, context.parseDateFn),
  }
}

export const createEmbedPlaceholder = (
  document: Document,
  metadata: Partial<EmbedResolverResult> & Pick<EmbedResolverResult, 'src'>,
): HTMLElement => {
  const element = document.createElement('div')
  updateEmbedPlaceholder(element, metadata)

  return element
}

// Key order is the attribute write order.
export const normalizeCiteFields = (
  result: Partial<CiteResolverResult>,
): Record<string, string | undefined> => {
  return {
    provider: result.provider,
    description: result.description,
    caption: result.caption,
    author: result.author,
    publisher: result.publisher,
    date: result.date,
    kind: result.kind,
    url: result.url,
    title: result.title,
    icon: result.icon,
    thumbnail: result.thumbnail,
  }
}

// Tumblr, Substack, Discourse, XenForo, Tistory and Paragraph carry the card url in an attribute
// or a JSON blob, still inside the publisher's redirect wrapper.
// Unlike an embed's, the url is kept unresolved: a card with a dead link still reads as text.
export const prepareCiteMetadata = (
  metadata: Partial<CiteResolverResult>,
  context: TransformContext,
): Partial<CiteResolverResult> => {
  return {
    ...metadata,
    url: cleanUrl(resolveOrKeepUrl(metadata.url, context), context),
    icon: resolveOrKeepUrl(metadata.icon, context),
    thumbnail: resolveOrKeepUrl(metadata.thumbnail, context),
    date: parseOrKeepDate(metadata.date, context.parseDateFn),
  }
}

export const updateCitePlaceholder = (
  element: Element,
  result: Partial<CiteResolverResult>,
): void => {
  updatePlaceholder(element, 'cite', normalizeCiteFields(result))
}

export const createCitePlaceholder = (
  document: Document,
  result: CiteResolverResult,
): HTMLElement => {
  return createPlaceholder(document, 'cite', normalizeCiteFields(result))
}

// The pass both placeholder kinds run for enrichment: read a ref off every placeholder in the
// document, hand the whole set to the caller's enricher in one call, and write the answers back by
// position. A slot the enricher left undefined leaves its placeholder as the resolver built it.
export const createPlaceholderEnricher = <TRef, TData>(
  selector: string,
  readRef: (element: Element) => TRef,
  enrich: (refs: Array<TRef>) => MaybePromise<Array<TData | undefined>>,
  update: (element: Element, data: TData) => void,
) => {
  return async (document: Document): Promise<void> => {
    const placeholders = document.querySelectorAll(selector)
    const count = placeholders.length

    if (!count) {
      return
    }

    const refs: Array<TRef> = new Array(count)

    for (let i = 0; i < count; i++) {
      refs[i] = readRef(placeholders[i])
    }

    const enriched = await enrich(refs)

    for (let i = 0; i < count; i++) {
      const data = enriched[i]

      if (data) {
        update(placeholders[i], data)
      }
    }
  }
}
