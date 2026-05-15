import { resolveUrl } from 'feedcanon'
import { parseHTML } from 'linkedom'
import type { EmbedResolverResult, MaybePromise } from './types.js'

// Linkedom mis-types Node as `() => void` in facades.d.ts (WebReflection/linkedom#167).
export const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 } as const

const base64SrcRegex = /((?:src|srcset|poster)=["'])data:[^"']*;base64,[^"']*(["'])/g
const safeThumbnailDataUrlRegex = /^data:image\/(png|jpe?g|gif|webp|avif);/i

const isSafeThumbnailUrl = (url: string): boolean => {
  return resolveUrl(url) !== undefined || safeThumbnailDataUrlRegex.test(url)
}

export const stripOversizedBase64Sources = (html: string, maxSize: number): string => {
  return html.replace(base64SrcRegex, (match, prefix, suffix) => {
    if (match.length < maxSize) {
      return match
    }

    return `${prefix}${suffix}`
  })
}

// Linkedom hard-codes `lowerCaseAttributeNames: false` and the maintainer declined to expose
// a toggle (WebReflection/linkedom#235, won't fix). Normalize once at parse time so every
// transform reads attributes by canonical lowercase name. Per the HTML spec, the first
// occurrence of a duplicate (case-folded) name wins.
export const normalizeAttributeCase = (document: Document): void => {
  for (const element of document.querySelectorAll('*')) {
    const original = Array.from(element.attributes).map((attribute) => ({
      name: attribute.name,
      value: attribute.value,
    }))
    const final = new Map<string, string>()
    let needsRewrite = false

    for (const { name, value } of original) {
      const lower = name.toLowerCase()

      if (lower !== name) {
        needsRewrite = true
      }

      if (final.has(lower)) {
        needsRewrite = true
        continue
      }

      final.set(lower, value)
    }

    if (!needsRewrite) {
      continue
    }

    for (const { name } of original) {
      element.removeAttribute(name)
    }

    for (const [name, value] of final) {
      element.setAttribute(name, value)
    }
  }
}

export const parseFragment = (html: string): Document => {
  const { document } = parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`)

  normalizeAttributeCase(document)

  return document
}

export const transformHtml = async (
  html: string,
  transform: (document: Document) => MaybePromise<void>,
): Promise<string> => {
  const document = parseFragment(html)

  await transform(document)

  return document.body.innerHTML
}

export const applyDomTransforms = async (
  html: string,
  transforms: Array<(document: Document) => MaybePromise<void>>,
): Promise<string> => {
  // Base64 images can be megabytes of text that bloat linkedom's DOM tree memory.
  // Strip oversized ones before DOM parsing to reduce memory usage.
  const stripped = stripOversizedBase64Sources(html, 50 * 1024)
  const document = parseFragment(stripped)

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
    set('data-embed-src', metadata.src)
  }

  if (metadata.url) {
    set('data-embed-url', metadata.url)
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

  element.setAttribute('data-embed', 'iframe')
  element.setAttribute('data-embed-src', metadata?.src ?? src)

  if (metadata) {
    applyEmbedMetadata(element, metadata)
  }

  const fallbackUrl = metadata?.url ?? metadata?.src ?? src
  const link = document.createElement('a')
  link.setAttribute('href', fallbackUrl)
  link.textContent = fallbackUrl
  element.appendChild(link)

  return element
}
