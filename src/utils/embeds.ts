import { isHostOf, isSubdomainOf } from 'trousse'
import type { CiteResolverResult, EmbedResolver, EmbedResolverResult } from '../types.js'
import type { GeneratedWrapperType } from './dom.js'

// Every video provider matches the same iframe and differs only in which hosts it claims
// and how it reads an id out of the src, so the match itself lives here.
//
// This is not a pattern to copy for resolvers generally: it exists because these three
// bodies were already identical. The cite resolvers each read a different shape, so a
// shared builder there would need a config language and would cost more than it saves.
export const createIframeEmbedResolver = (
  hosts: Array<string>,
  resolveEmbed: (url: string) => EmbedResolverResult | undefined,
): EmbedResolver => {
  return {
    selector: 'iframe[src]',
    extract: (element) => {
      const src = element.getAttribute('src') ?? ''

      if (!isHostOf(src, hosts) && !isSubdomainOf(src, hosts)) {
        return
      }

      return resolveEmbed(src)
    },
  }
}

// Writes a field record as `data-{type}-*` attributes, leaving the ones already on the
// element alone so a resolver's own values always survive an enrichment pass.
export const updatePlaceholder = <Type extends object>(
  element: HTMLElement,
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
    duration: metadata.duration ? String(metadata.duration) : undefined,
  }
}

export const updateEmbedPlaceholder = (
  element: HTMLElement,
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
  element: HTMLElement,
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
