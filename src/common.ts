import { resolveUrl, upgradeProtocol } from 'feedcanon'
import type { BookmarkResolverResult, EmbedResolverResult, MaybePromise } from './types.js'
import { coerceNumber } from './utils.js'

// Linkedom mis-types Node as `() => void` in facades.d.ts (WebReflection/linkedom#167).
export const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 } as const

// NodeFilter is not globally available in Bun; mirror the DOM-spec constants.
export const NodeFilter = { SHOW_ELEMENT: 0x1, SHOW_TEXT: 0x4, SHOW_COMMENT: 0x80 } as const

const safeThumbnailDataUrlRegex = /^data:image\/(png|jpe?g|gif|webp|avif);/i

export const isSafeThumbnailUrl = (url: string): boolean => {
  return resolveUrl(url) !== undefined || safeThumbnailDataUrlRegex.test(url)
}

export const applyDomTransforms = async (
  document: Document,
  transforms: Array<(document: Document) => MaybePromise<void>>,
): Promise<string> => {
  for (const transform of transforms) {
    await transform(document)
  }

  return document.body.innerHTML
}

export const applyStringTransforms = async (
  html: string,
  transforms: Array<(html: string) => MaybePromise<string>>,
): Promise<string> => {
  let output = html

  for (const transform of transforms) {
    output = await transform(output)
  }

  return output
}

export const blockElements = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'center',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'ul',
])

export const isWhitespaceText = (node: Node): boolean => {
  return node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()
}

export const isBr = (node: Node): boolean => {
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).localName === 'br'
}

export const isComment = (node: Node): boolean => {
  return node.nodeType === Node.COMMENT_NODE
}

export const isSkippable = (node: Node): boolean => {
  return isWhitespaceText(node) || isBr(node) || isComment(node)
}

export const isBlockElement = (node: Node): boolean => {
  return node.nodeType === Node.ELEMENT_NODE && blockElements.has((node as Element).localName)
}

export const hasAncestorWithTagName = (node: Node, tagSet: Set<string>, stopAt?: Node): boolean => {
  let ancestor = node.parentNode as Element | null

  while (ancestor !== null && ancestor !== stopAt) {
    if (ancestor.nodeType === Node.ELEMENT_NODE && tagSet.has(ancestor.localName)) {
      return true
    }
    ancestor = ancestor.parentNode as Element | null
  }

  return false
}

// Matches `<prop>: <number>[px];` — px is optional, other units (em/rem/%) don't match.
const styleWidthRegex = /(?:^|;)\s*width\s*:\s*([0-9]*\.?[0-9]+)\s*(?:px)?\s*(?:;|$)/i
const styleHeightRegex = /(?:^|;)\s*height\s*:\s*([0-9]*\.?[0-9]+)\s*(?:px)?\s*(?:;|$)/i

export const getDimensions = (element: Element): { width?: number; height?: number } => {
  const width = coerceNumber(element.getAttribute('width'))
  const height = coerceNumber(element.getAttribute('height'))

  if (width !== undefined && height !== undefined) {
    return { width, height }
  }

  const style = element.getAttribute('style')

  if (!style) {
    return { width, height }
  }

  const fromStyle = (regex: RegExp): number | undefined => {
    const match = regex.exec(style)
    return match ? coerceNumber(match[1]) : undefined
  }

  return {
    width: width ?? fromStyle(styleWidthRegex),
    height: height ?? fromStyle(styleHeightRegex),
  }
}

export const applyEmbedMetadata = (
  element: HTMLElement,
  metadata: Partial<EmbedResolverResult>,
  options?: { setIfMissing?: boolean },
): void => {
  const setIfMissing = options?.setIfMissing ?? false

  const set = (name: string, value: string) => {
    if (setIfMissing && element.hasAttribute(name)) {
      return
    }
    element.setAttribute(name, value)
  }

  if (metadata.provider) {
    set('data-embed-provider', metadata.provider)
  }

  if (metadata.id) {
    set('data-embed-id', metadata.id)
  }

  if (metadata.src) {
    set('data-embed-src', upgradeProtocol(metadata.src))
  }

  if (metadata.url) {
    set('data-embed-url', upgradeProtocol(metadata.url))
  }

  if (metadata.thumbnail && isSafeThumbnailUrl(metadata.thumbnail)) {
    set('data-embed-thumbnail', metadata.thumbnail)
  }

  if (metadata.width) {
    set('data-embed-width', String(metadata.width))
  }

  if (metadata.height) {
    set('data-embed-height', String(metadata.height))
  }

  if (metadata.title) {
    set('data-embed-title', metadata.title)
  }

  if (metadata.description) {
    set('data-embed-description', metadata.description)
  }

  if (metadata.author) {
    set('data-embed-author', metadata.author)
  }

  if (metadata.avatar && isSafeThumbnailUrl(metadata.avatar)) {
    set('data-embed-avatar', metadata.avatar)
  }

  if (metadata.duration) {
    set('data-embed-duration', String(metadata.duration))
  }
}

export const createEmbedPlaceholder = (
  document: Document,
  src: string,
  metadata?: Partial<EmbedResolverResult>,
): HTMLElement => {
  const element = document.createElement('div')

  element.setAttribute('data-embed-src', upgradeProtocol(metadata?.src ?? src))

  if (metadata) {
    applyEmbedMetadata(element, metadata)
  }

  const fallbackUrl = upgradeProtocol(metadata?.url ?? metadata?.src ?? src)
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
  const safeUrl = upgradeProtocol(url)

  const element = document.createElement('div')
  element.setAttribute('data-bookmark-provider', provider)

  const fields: Record<string, string | undefined> = {
    ...rest,
    url: safeUrl,
    title,
    icon: icon && isSafeThumbnailUrl(icon) ? upgradeProtocol(icon) : undefined,
    thumbnail: thumbnail && isSafeThumbnailUrl(thumbnail) ? upgradeProtocol(thumbnail) : undefined,
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      element.setAttribute(`data-bookmark-${key}`, value)
    }
  }

  const link = document.createElement('a')
  link.setAttribute('href', safeUrl)
  link.textContent = title
  element.appendChild(link)

  return element
}
