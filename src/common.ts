import { parseHTML } from 'linkedom'
import type { EmbedResolverResult } from './types.js'
import { isHttpUrl } from './utils.js'

// Linkedom mis-types Node as `() => void` in facades.d.ts (WebReflection/linkedom#167).
export const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 } as const

const base64SrcRegex = /((?:src|srcset|poster)=["'])data:[^"']*;base64,[^"']*(["'])/g

export const stripOversizedBase64Sources = (html: string, maxSize: number): string => {
  return html.replace(base64SrcRegex, (match, prefix, suffix) => {
    if (match.length < maxSize) {
      return match
    }

    return `${prefix}${suffix}`
  })
}

export const parseFragment = (html: string): Document => {
  const { document } = parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`)

  return document
}

export const transformHtml = (html: string, transform: (document: Document) => void): string => {
  const document = parseFragment(html)

  transform(document)

  return document.body.innerHTML
}

export const applyDomTransforms = (
  html: string,
  transforms: Array<(document: Document) => void>,
): string => {
  // Base64 images can be megabytes of text that bloat linkedom's DOM tree memory.
  // Strip oversized ones before DOM parsing to reduce memory usage.
  const stripped = stripOversizedBase64Sources(html, 50 * 1024)
  const document = parseFragment(stripped)

  for (const transform of transforms) {
    transform(document)
  }

  return document.body.innerHTML
}

export const applyStringTransforms = (
  html: string,
  transforms: Array<(html: string) => string>,
): string => {
  let output = html

  for (const transform of transforms) {
    output = transform(output)
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
  return node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()
}

export const isBr = (node: Node): boolean => {
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'br'
}

export const isComment = (node: Node): boolean => {
  return node.nodeType === Node.COMMENT_NODE
}

export const isSkippable = (node: Node): boolean => {
  return isWhitespaceText(node) || isBr(node) || isComment(node)
}

export const isBlockElement = (node: Node): boolean => {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    blockElements.has((node as Element).tagName.toLowerCase())
  )
}

// Strips outermost matching wrapper tags, looping until stable.
export const unwrapOuterTag = (html: string, pattern: RegExp): string => {
  let result = html.trim()
  let match = pattern.exec(result)

  while (match) {
    result = match[3].trim()
    match = pattern.exec(result)
  }

  return result
}

export const createEmbedPlaceholder = (
  document: Document,
  src: string,
  type: 'video' | 'audio' | 'iframe',
  metadata?: Partial<EmbedResolverResult>,
): HTMLElement => {
  const element = document.createElement('div')

  element.setAttribute('data-embed', metadata?.type ?? type)

  const candidateSrc = metadata?.src ?? src
  const safeSrc = isHttpUrl(candidateSrc) ? candidateSrc : undefined

  if (safeSrc) {
    element.setAttribute('data-embed-src', safeSrc)
  }

  if (metadata?.provider) {
    element.setAttribute('data-embed-provider', metadata.provider)
  }

  const safeUrl = metadata?.url && isHttpUrl(metadata.url) ? metadata.url : undefined

  if (safeUrl) {
    element.setAttribute('data-embed-url', safeUrl)
  }

  if (metadata?.thumbnail && isHttpUrl(metadata.thumbnail)) {
    element.setAttribute('data-embed-thumbnail', metadata.thumbnail)
  }

  if (metadata?.width) {
    element.setAttribute('data-embed-width', String(metadata.width))
  }

  if (metadata?.height) {
    element.setAttribute('data-embed-height', String(metadata.height))
  }

  if (metadata?.author) {
    element.setAttribute('data-embed-author', metadata.author)
  }

  if (metadata?.text) {
    element.setAttribute('data-embed-text', metadata.text)
  }

  const fallbackUrl = safeUrl ?? safeSrc

  if (fallbackUrl) {
    const link = document.createElement('a')
    link.setAttribute('href', fallbackUrl)
    link.textContent = fallbackUrl
    element.appendChild(link)
  }

  return element
}
