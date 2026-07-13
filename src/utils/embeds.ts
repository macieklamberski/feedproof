import type {
  BookmarkResolverResult,
  EmbedResolverResult,
  GalleryResolverResult,
} from '../types.js'

export const createPlaceholder = <Type extends object>(
  document: Document,
  type: string,
  fields: Type,
): HTMLElement => {
  const element = document.createElement('div')

  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      element.setAttribute(`data-${type}-${key}`, value)
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

    if (value && !element.hasAttribute(name)) {
      element.setAttribute(name, value)
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

  const fallbackUrl = metadata?.url ?? metadata?.src ?? src
  const link = document.createElement('a')
  link.setAttribute('href', fallbackUrl)
  link.textContent = fallbackUrl
  element.appendChild(link)

  return element
}

export const createBookmarkPlaceholder = (
  document: Document,
  result: BookmarkResolverResult,
): HTMLElement => {
  const { provider, title, url, icon, thumbnail, ...rest } = result

  const element = createPlaceholder(document, 'bookmark', {
    provider,
    ...rest,
    url,
    title,
    icon,
    thumbnail,
  })

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.textContent = title
  element.appendChild(link)

  return element
}

export const createGalleryPlaceholder = (
  document: Document,
  result: GalleryResolverResult,
): HTMLElement => {
  const items = result.items

  // URLs inside data-gallery-items are not run through proxyAssetUrls (it only
  // rewrites element src/href). Left as-is for v1 — consumers proxy at render.
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
