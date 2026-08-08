import { isHostOf, isSubdomainOf } from 'trousse'
import type {
  CiteResolverResult,
  EmbedResolver,
  EmbedResolverResult,
  GalleryResolverResult,
  MediaResolverResult,
  ParseDateFn,
  WidgetResolverResult,
} from '../types.js'
import {
  type GeneratedWrapperType,
  getElementDimensions,
  getWrapperRatioDimensions,
} from './dom.js'

// A card's date is whatever string the site chose to display, so the caller gets one chance
// to normalize it and anything the parser rejects is kept verbatim rather than dropped.
// Mirrors resolveOrKeepUrl's contract for URLs: every path that writes a date uses this, so
// resolver output and enrichment payloads are treated identically.
export const parseOrKeepDate = (
  date: string | undefined,
  parseDateFn: ParseDateFn | undefined,
): string | undefined => {
  return date ? (parseDateFn?.(date) ?? date) : undefined
}

// The elements that carry a third-party URL for someone else to render, each with the
// attribute holding it: `<object>` names that URL `data` while the other two use `src`, and
// that is the only difference between them. Adding a carrier is one line here, because both
// the selector and the reader below are derived from this.
//
// Legacy Flash markup nests an `<embed>` inside an `<object>` and both match. The outer one
// wins by document order and takes the inner with it.
export const embedCarriers: Record<string, string> = {
  iframe: 'src',
  embed: 'src',
  object: 'data',
}

export const embedCarrierSelector = Object.entries(embedCarriers)
  .map(([tag, attribute]) => `${tag}[${attribute}]`)
  .join(', ')

export const readCarrierUrl = (element: Element): string => {
  return element.getAttribute(embedCarriers[element.localName] ?? 'src') ?? ''
}

// A resolver that has measured the platform can overrule what the carrier declares. Scribd
// states the same `height="500"` on every document it embeds and keeps the honest ratio in
// `data-aspect-ratio`, so a number from the markup is not always the better one.
//
// The default is to trust the markup, because the publisher chose it for the player they
// embedded. `declaredSize: false` says the resolver's own numbers stand, and it reads at the
// registration site rather than being inferred from a missing call.
export type ResolverOptions = {
  declaredSize?: boolean
}

// A resolver whose selector names the platform's own markup. The size the carrier declares is
// applied for it, the same way the url-keyed factory does, so neither kind has to remember, and
// `declaredSize: false` is how one that knows better opts out.
export const createMarkupEmbedResolver = (
  selector: string,
  extract: (element: Element) => EmbedResolverResult | undefined,
  { declaredSize = true }: ResolverOptions = {},
): EmbedResolver => {
  return {
    selector,
    extract: (element) => {
      const result = extract(element)

      return declaredSize ? withDeclaredSize(element, result) : result
    },
  }
}

// The size a publisher states on the carrier outranks anything a resolver derived, because it
// was chosen for the player they actually embedded. Resolvers apply it themselves rather than
// having it applied to them, so one that has measured the platform can decline: a snippet that
// hardcodes the same height whatever the content is states a number worth overruling.
//
// Each dimension is spread only when the element actually states it. getElementDimensions
// returns both keys whichever way, so spreading it whole would erase a platform's own height
// with undefined wherever the markup is silent, and would put an undefined-valued key on every
// result besides.
export const withDeclaredSize = (
  element: Element,
  result: EmbedResolverResult | undefined,
): EmbedResolverResult | undefined => {
  if (!result) {
    return
  }

  const { width, height } = getEmbedDimensions(element)

  return {
    ...result,
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
  }
}

// When the carrier states no usable size, a responsive wrapper's aspect ratio is the next best
// thing, so the placeholder can still reserve space.
export const getEmbedDimensions = (element: Element): { width?: number; height?: number } => {
  const dimensions = getElementDimensions(element)

  if (dimensions.width === undefined && dimensions.height === undefined) {
    return getWrapperRatioDimensions(element) ?? dimensions
  }

  return dimensions
}

// Every provider matches the same carriers and differs only in which hosts it claims and
// how it reads an id out of the URL, so the match itself lives here. Keying on the URL
// rather than on markup is what separates these resolvers from the ones that recognise a
// platform's own class or attribute, and it is why the name says url and not iframe.
//
// This is not a pattern to copy for resolvers generally: it exists because these bodies
// were already identical. The cite resolvers each read a different shape, so a shared
// builder there would need a config language and would cost more than it saves.
//
// The element travels alongside the url because a carrier can hold more than its src: an
// iframe's `title` is the one field a publisher's snippet states that the url does not carry.
// Resolvers that need nothing but the url ignore the second argument.
export const createUrlEmbedResolver = (
  hosts: Array<string>,
  extract: (url: string, element: Element) => EmbedResolverResult | undefined,
  { declaredSize = true }: ResolverOptions = {},
): EmbedResolver => {
  return {
    selector: embedCarrierSelector,
    extract: (element) => {
      const src = readCarrierUrl(element)

      if (!isHostOf(src, hosts) && !isSubdomainOf(src, hosts)) {
        return
      }

      const result = extract(src, element)

      return declaredSize ? withDeclaredSize(element, result) : result
    },
  }
}

// Writes a field record as `data-{type}-*` attributes, leaving the ones already on the
// element alone so a resolver's own values always survive an enrichment pass.
// Tells a media result apart from an embed result in the widget pass: only media results
// carry the element tag to mint.
export const isMediaResult = (result: WidgetResolverResult): result is MediaResolverResult => {
  return 'tag' in result
}

export const updatePlaceholder = <Type extends object>(
  element: Element,
  type: GeneratedWrapperType,
  fields: Type,
): void => {
  // Trimming here lets resolvers pass extracted text as-is; a value that is only
  // whitespace trims to an empty string and is skipped with the other empty fields.
  for (const [key, value] of Object.entries(fields)) {
    const name = `data-${type}-${key}`
    const cleaned = typeof value === 'string' ? value.trim() : value

    if (cleaned && !element.hasAttribute(name)) {
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

// Maps embed metadata to its `data-embed-*` field record. Key order is the
// attribute write order, so it's kept stable. Shared by embed creation and
// enrichment so the per-field rules live in one place.
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
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    avatar: metadata.avatar,
    publisher: metadata.publisher,
    date: metadata.date,
    duration: metadata.duration ? String(metadata.duration) : undefined,
  }
}

export const updateEmbedPlaceholder = (
  element: Element,
  metadata: Partial<EmbedResolverResult>,
): void => {
  updatePlaceholder(element, 'embed', normalizeEmbedFields(metadata))
}

// `src` is the one field a placeholder cannot be built without, so it is required inside the
// metadata rather than passed beside it — a second argument would let the two disagree.
export const createEmbedPlaceholder = (
  document: Document,
  metadata: Partial<EmbedResolverResult> & Pick<EmbedResolverResult, 'src'>,
): HTMLElement => {
  const element = createPlaceholder(document, 'embed', normalizeEmbedFields(metadata))

  const fallbackUrl = (metadata.url ?? metadata.src).trim()
  const link = document.createElement('a')
  link.setAttribute('href', fallbackUrl)
  link.textContent = fallbackUrl
  element.appendChild(link)

  return element
}

// Maps cite metadata to its `data-cite-*` field record. Key order is the attribute write
// order, so it's kept stable. Shared by cite creation and enrichment so the field set lives
// in one place: an enricher passing a whole API payload through cannot reach beyond these
// names, and no value ever ends up in an attribute name.
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
  const element = createPlaceholder(document, 'cite', normalizeCiteFields(result))

  const link = document.createElement('a')
  link.setAttribute('href', result.url.trim())
  link.textContent = result.title.trim()
  element.appendChild(link)

  return element
}

// The items live twice on the placeholder: as `data-gallery-items` JSON (the primary
// render path for a gallery-aware reader) and as plain <figure> children (the fallback
// any reader renders as ordinary images).
export const createGalleryPlaceholder = (
  document: Document,
  result: GalleryResolverResult,
): HTMLElement => {
  const items = result.items

  const element = createPlaceholder(document, 'gallery', {
    provider: result.provider,
    layout: result.layout,
    title: result.title,
    items: items.length ? JSON.stringify(items) : undefined,
  })

  for (const item of items) {
    const figure = document.createElement('figure')
    const image = document.createElement('img')
    image.setAttribute('src', item.url)

    if (item.alt) {
      image.setAttribute('alt', item.alt)
    }

    if (item.fullUrl) {
      const link = document.createElement('a')
      link.setAttribute('href', item.fullUrl)
      link.appendChild(image)
      figure.appendChild(link)
    } else {
      figure.appendChild(image)
    }

    if (item.caption) {
      const caption = document.createElement('figcaption')
      caption.textContent = item.caption
      figure.appendChild(caption)
    }

    element.appendChild(figure)
  }

  return element
}

// Rewrites the URL-carrying fields inside a gallery placeholder's `data-gallery-items`
// JSON in place. The fallback figures are reached by the generic element passes, but the
// JSON is opaque to them, so neutralizeUnsafeUrls and proxyAssetUrls call this to cover it
// too. `rewrite` returns a replacement URL, or undefined to leave the value unchanged;
// `key` lets the caller apply a different policy to the display `url` (media) than the
// full-size `fullUrl` (link).
export const rewriteGalleryItemUrls = (
  element: Element,
  rewrite: (url: string, key: 'url' | 'fullUrl') => string | undefined,
): void => {
  const raw = element.getAttribute('data-gallery-items')

  if (!raw) {
    return
  }

  let items: Array<Record<string, unknown>>

  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return
    }

    items = parsed
  } catch {
    return
  }

  let hasChanged = false

  for (const item of items) {
    for (const key of ['url', 'fullUrl'] as const) {
      const value = item[key]

      if (typeof value !== 'string') {
        continue
      }

      const rewritten = rewrite(value, key)

      if (rewritten !== undefined && rewritten !== value) {
        item[key] = rewritten
        hasChanged = true
      }
    }
  }

  if (hasChanged) {
    element.setAttribute('data-gallery-items', JSON.stringify(items))
  }
}
