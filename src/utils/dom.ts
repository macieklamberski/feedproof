import { coerceNumber } from './numbers.js'

// Linkedom mis-types Node as `() => void` in facades.d.ts (WebReflection/linkedom#167).
export const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 } as const

// NodeFilter is not globally available in Bun; mirror the DOM-spec constants.
export const NodeFilter = { SHOW_ELEMENT: 0x1, SHOW_TEXT: 0x4, SHOW_COMMENT: 0x80 } as const

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

// Remove an element along with any wrapper (a/figure) it leaves empty, so a
// removed image doesn't leave a dangling link or empty figure behind.
export const removeWithEmptyWrappers = (element: Element): void => {
  let current: Element | null = element

  while (current) {
    const parent: Element | null = current.parentElement
    current.remove()

    if (!parent || (parent.tagName !== 'A' && parent.tagName !== 'FIGURE')) {
      break
    }

    const isEmpty = parent.children.length === 0 && (parent.textContent ?? '').trim() === ''
    if (!isEmpty) {
      break
    }

    current = parent
  }
}

// Embedded media that readers render on its own line, so it breaks the flow like
// a block does even though HTML defaults it to inline.
export const mediaElements = new Set([
  'audio',
  'embed',
  'iframe',
  'img',
  'object',
  'picture',
  'video',
])

export const isMediaElement = (node: Node): boolean => {
  return isElement(node) && mediaElements.has(node.localName)
}

// Collects a subtree's text nodes via an iterative depth-first walk (an explicit stack
// rather than recursion) so a deeply nested document can't overflow the call stack.
// Children are pushed in reverse so they pop in document order. An element for which
// shouldPruneElement returns true prunes its whole subtree.
export const collectTextNodes = (
  root: Node,
  shouldPruneElement: (element: Element) => boolean,
): Array<Node> => {
  const result: Array<Node> = []
  const stack: Array<Node> = [root]

  while (stack.length > 0) {
    const node = stack.pop() as Node

    if (isText(node)) {
      result.push(node)
      continue
    }

    if (isElement(node) && shouldPruneElement(node)) {
      continue
    }

    const children = node.childNodes

    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index])
    }
  }

  return result
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
// The numeric group gives each digit a single parse (`[0-9]+(?:\.[0-9]+)?|\.[0-9]+`, not
// `[0-9]*\.?[0-9]+`): the ambiguous form backtracks quadratically on a long digit run
// followed by a non-terminator, which `style` (an unbounded untrusted attribute) can carry.
const styleWidthRegex = /(?:^|;)\s*width\s*:\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*(?:px)?\s*(?:;|$)/i
const styleHeightRegex =
  /(?:^|;)\s*height\s*:\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*(?:px)?\s*(?:;|$)/i

// An empty or whitespace-only width/height attribute (`width=""`, common in editor output)
// is not a declared dimension. coerceNumber reads it as 0 (Number('') === 0), which would
// collapse media to a zero box and read as a tracking pixel; treat it as absent instead.
const dimensionAttribute = (element: Element, name: string): number | undefined => {
  const value = element.getAttribute(name)?.trim()
  return value ? coerceNumber(value) : undefined
}

export const getElementDimensions = (element: Element): { width?: number; height?: number } => {
  const width = dimensionAttribute(element, 'width')
  const height = dimensionAttribute(element, 'height')

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

// How many ancestors above the element to also check for a responsive wrapper.
const maxWrapperAncestorDepth = 3
// Modern CSS: `aspect-ratio: 16 / 9` (or a single number, the width-to-height ratio).
const aspectRatioRegex = /aspect-ratio:\s*(?:auto\s+)?([\d.]+)(?:\s*\/\s*([\d.]+))?/i
// WordPress responsive embeds carry the ratio as a class (`wp-embed-aspect-16-9`),
// styled by an external stylesheet feedsweep never sees; the class itself encodes it.
const aspectClassRegex = /wp-embed-aspect-(\d+)-(\d+)/
// The legacy shape is the inline padding hack (`padding-bottom:56.25%`). All three are read
// off the raw `style`/`class` attributes, not the CSSOM `style` API: linkedom's getPropertyValue
// returns `undefined` (not "") for unset properties, and both parsers drop declarations whose
// property name isn't lowercase — a case-insensitive regex matches those, mirroring getElementDimensions.
const paddingRatioRegex = /padding-(?:bottom|top):\s*([\d.]+)%/i

// The width-to-height aspect ratio (e.g. 16/9 ≈ 1.78) a single element declares — via the
// `aspect-ratio` property, a `wp-embed-aspect-*` class, or the padding hack — or undefined.
export const getElementAspectRatio = (element: Element): number | undefined => {
  const style = element.getAttribute('style') ?? ''

  const ratioMatch = aspectRatioRegex.exec(style)

  if (ratioMatch) {
    const width = Number(ratioMatch[1])
    const height = ratioMatch[2] === undefined ? 1 : Number(ratioMatch[2])

    if (width > 0 && height > 0) {
      return width / height
    }
  }

  const classMatch = aspectClassRegex.exec(element.getAttribute('class') ?? '')

  if (classMatch) {
    const width = Number(classMatch[1])
    const height = Number(classMatch[2])

    if (width > 0 && height > 0) {
      return width / height
    }
  }

  const paddingMatch = paddingRatioRegex.exec(style)

  if (paddingMatch) {
    const percent = Number(paddingMatch[1])

    if (percent > 0 && percent < 1000) {
      return 100 / percent
    }
  }
}

// Walks the element and its ancestors (the element plus up to `maxDepth` levels) and returns the
// first aspect ratio any of them declares — for an element whose own dimensions are unknown but
// which sits in a responsive wrapper. Only ascends into a parent that wraps this element alone:
// a parent with other element children sizes the whole group, so its ratio isn't this element's.
// Call getElementAspectRatio directly when only the element itself matters (e.g. an image with
// its own `aspect-ratio`).
export const getWrapperAspectRatio = (
  element: Element,
  maxDepth = maxWrapperAncestorDepth,
): number | undefined => {
  let current: Element | null = element
  let depth = 0

  while (current && depth <= maxDepth) {
    const ratio = getElementAspectRatio(current)

    if (ratio !== undefined) {
      return ratio
    }

    const parent: Element | null = current.parentElement

    if (!parent || parent.children.length > 1) {
      break
    }

    current = parent
    depth++
  }
}

// A width or height at or below this many pixels marks a tracking pixel, not real
// content. removeTrackingPixels strips images at or below it; resolveMediaDimensions
// won't promote a dimension at or below it.
export const pixelDimensionLimit = 2

const styleDisplayNoneRegex = /(?:^|;)\s*display\s*:\s*none/i
const styleVisibilityHiddenRegex = /(?:^|;)\s*visibility\s*:\s*hidden/i

// An element hidden from view: the `hidden` attribute, inline `display:none`, or
// inline `visibility:hidden`. These are unambiguous. Other "hidden" signals are
// overloaded and stay with their callers — `opacity:0` is usually a fade-in and
// `0×0` is the lazy-placeholder convention, both handled in removeTrackingPixels.
export const isElementHidden = (element: Element): boolean => {
  if (element.hasAttribute('hidden')) {
    return true
  }

  const style = element.getAttribute('style')

  return !!style && (styleDisplayNoneRegex.test(style) || styleVisibilityHiddenRegex.test(style))
}
