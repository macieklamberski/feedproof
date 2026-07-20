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

export const createPlaceholder = <Type extends object>(
  document: Document,
  type: GeneratedWrapperType,
  fields: Type,
): HTMLElement => {
  const element = document.createElement('div')

  // Trimming here lets resolvers pass extracted text as-is; a value that is only
  // whitespace trims to an empty string and is skipped with the other empty fields.
  for (const [key, value] of Object.entries(fields)) {
    const cleaned = typeof value === 'string' ? value.trim() : value

    if (cleaned) {
      element.setAttribute(`data-${type}-${key}`, cleaned)
    }
  }

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
  for (const [key, value] of Object.entries(normalizeEmbedFields(metadata))) {
    const name = `data-embed-${key}`
    const cleaned = value?.trim()

    if (cleaned && !element.hasAttribute(name)) {
      element.setAttribute(name, cleaned)
    }
  }
}

export const createEmbedPlaceholder = (
  document: Document,
  src: string,
  metadata?: Partial<EmbedResolverResult>,
): HTMLElement => {
  const element = createPlaceholder(
    document,
    'embed',
    normalizeEmbedFields({ ...metadata, src: metadata?.src ?? src }),
  )

  const fallbackUrl = (metadata?.url ?? metadata?.src ?? src).trim()
  const link = document.createElement('a')
  link.setAttribute('href', fallbackUrl)
  link.textContent = fallbackUrl
  element.appendChild(link)

  return element
}

export const createCitePlaceholder = (
  document: Document,
  result: CiteResolverResult,
): HTMLElement => {
  const { provider, title, url, icon, thumbnail, ...rest } = result

  const element = createPlaceholder(document, 'cite', {
    provider,
    ...rest,
    url,
    title,
    icon,
    thumbnail,
  })

  const link = document.createElement('a')
  link.setAttribute('href', url.trim())
  link.textContent = title.trim()
  element.appendChild(link)

  return element
}
