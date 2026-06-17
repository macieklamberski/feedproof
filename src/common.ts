import { resolveUrl, upgradeProtocol } from 'feedcanon'
import type {
  BookmarkResolverResult,
  EmbedResolverResult,
  MaybePromise,
  ResolveUrlFn,
} from './types.js'
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

export const isElement = (node: Node | null | undefined): node is Element => {
  return node?.nodeType === Node.ELEMENT_NODE
}

export const isText = (node: Node | null | undefined): node is Text => {
  return node?.nodeType === Node.TEXT_NODE
}

export const isComment = (node: Node | null | undefined): node is Comment => {
  return node?.nodeType === Node.COMMENT_NODE
}

export const isWhitespaceText = (node: Node): boolean => {
  return isText(node) && !node.textContent?.trim()
}

export const isBr = (node: Node): boolean => {
  return isElement(node) && node.localName === 'br'
}

export const isSkippable = (node: Node): boolean => {
  return isWhitespaceText(node) || isBr(node) || isComment(node)
}

export const isBlockElement = (node: Node): boolean => {
  return isElement(node) && blockElements.has(node.localName)
}

// JSON shape + parseability predicates. Candidates to move to the shared toolbox
// package later (the same helpers live in other projects).
const jsonObjectStartPattern = /^\s*\{/
const jsonObjectEndPattern = /\}\s*$/
const jsonArrayStartPattern = /^\s*\[/
const jsonArrayEndPattern = /\]\s*$/

export const isJsonLike = (value: string): boolean => {
  if (value.length < 2) {
    return false
  }

  return (
    (jsonObjectStartPattern.test(value) && jsonObjectEndPattern.test(value)) ||
    (jsonArrayStartPattern.test(value) && jsonArrayEndPattern.test(value))
  )
}

export const isParseableJson = (value: string): boolean => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export const hasAncestorWithTagName = (node: Node, tagSet: Set<string>, stopAt?: Node): boolean => {
  let ancestor = node.parentNode as Element | null

  while (ancestor !== null && ancestor !== stopAt) {
    if (isElement(ancestor) && tagSet.has(ancestor.localName)) {
      return true
    }
    ancestor = ancestor.parentNode as Element | null
  }

  return false
}

// Matches `<prop>: <number>[px];` — px is optional, other units (em/rem/%) don't match.
const styleWidthRegex = /(?:^|;)\s*width\s*:\s*([0-9]*\.?[0-9]+)\s*(?:px)?\s*(?:;|$)/i
const styleHeightRegex = /(?:^|;)\s*height\s*:\s*([0-9]*\.?[0-9]+)\s*(?:px)?\s*(?:;|$)/i

export const getElementDimensions = (element: Element): { width?: number; height?: number } => {
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

// A width or height at or below this many pixels marks a tracking pixel, not real
// content. removeTrackingPixels strips images at or below it; resolveMediaDimensions
// won't promote a dimension at or below it.
export const pixelDimensionLimit = 2

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
    src: metadata.src ? upgradeProtocol(metadata.src) : undefined,
    provider: metadata.provider,
    id: metadata.id,
    url: metadata.url ? upgradeProtocol(metadata.url) : undefined,
    thumbnail:
      metadata.thumbnail && isSafeThumbnailUrl(metadata.thumbnail) ? metadata.thumbnail : undefined,
    width: metadata.width ? String(metadata.width) : undefined,
    height: metadata.height ? String(metadata.height) : undefined,
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    avatar: metadata.avatar && isSafeThumbnailUrl(metadata.avatar) ? metadata.avatar : undefined,
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

  const element = createPlaceholder(document, 'bookmark', {
    provider,
    ...rest,
    url: safeUrl,
    title,
    icon: icon && isSafeThumbnailUrl(icon) ? upgradeProtocol(icon) : undefined,
    thumbnail: thumbnail && isSafeThumbnailUrl(thumbnail) ? upgradeProtocol(thumbnail) : undefined,
  })

  const link = document.createElement('a')
  link.setAttribute('href', safeUrl)
  link.textContent = title
  element.appendChild(link)

  return element
}

// Whether an anchor href points at the same page as the post. A bare `#fragment`
// is inherently same-page; an absolute href counts only when it resolves to the
// same origin and path as `baseUrl` — guarding against a fragment that points to
// (or coincidentally matches) a section on a different page.
export const isSamePage = (
  href: string,
  baseUrl: string | undefined,
  resolveUrlFn: ResolveUrlFn,
): boolean => {
  if (href.startsWith('#')) {
    return true
  }

  if (!baseUrl) {
    return false
  }

  const resolvedHref = resolveUrlFn(href, baseUrl)
  const resolvedBase = resolveUrlFn(baseUrl, undefined)

  if (!resolvedHref || !resolvedBase) {
    return false
  }

  try {
    const target = new URL(resolvedHref)
    const base = new URL(resolvedBase)

    return target.origin === base.origin && target.pathname === base.pathname
  } catch {}

  return false
}
