import { coerceNumber, isNonEmptyString, type Nullish, startsWithAnyOf } from 'trousse'

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

// Extraction helpers, used mainly by the cite resolvers to pull one field out of a card.
// Each accepts a nullable element and returns `undefined` rather than `null` or `''`, so
// they compose (`attr(find(element, selector), 'src')`) and chain (`a() ?? b()`) without
// optional-chaining noise, and so a blank value fails a `!value` guard.

// The first descendant matching `selector`, or the first one also satisfying `predicate`.
// The predicate form replaces `Array.from(element.querySelectorAll(…)).find(…)`: it builds
// no intermediate array and stops at the first match.
export const find = (
  element: Nullish<Element>,
  selector: string,
  predicate?: (node: Element) => boolean,
): Element | undefined => {
  if (!element) {
    return
  }

  if (!predicate) {
    return element.querySelector(selector) ?? undefined
  }

  for (const node of element.querySelectorAll(selector)) {
    if (predicate(node)) {
      return node
    }
  }
}

// Trimmed text of a descendant, or of the element itself when no selector is given.
export const text = (element: Nullish<Element>, selector?: string): string | undefined => {
  const target = selector ? find(element, selector) : element

  return target?.textContent?.trim() || undefined
}

// Trimmed text of the element's direct text-node children only, ignoring text inside any
// nested elements. For values that sit as a bare text node beside a sibling element.
export const textNode = (element: Nullish<Element>): string | undefined => {
  if (!element) {
    return
  }

  let result = ''

  for (const node of element.childNodes) {
    if (isText(node)) {
      result += node.textContent ?? ''
    }
  }

  return result.trim() || undefined
}

// Trimmed value of an attribute on the element itself.
export const attr = (element: Nullish<Element>, name: string): string | undefined => {
  return element?.getAttribute(name)?.trim() || undefined
}

// A Flash player's configuration, which is where a `.swf` carrier names what it plays: the
// url is only the player. The value sits either on the carrier itself, which is how `<embed>`
// spells it, or in a sibling `<param name="flashvars">`, which is how `<object>` does. Both
// dialects appear on the same platform and often in the same snippet, so a reader that knows
// one of them reads half the corpus. Returned raw, because callers disagree about what it
// holds: a query string for Brightcove and Flickr, a config blob for Archive.
export const flashVars = (element: Nullish<Element>): string | undefined => {
  const own = attr(element, 'flashvars')

  if (own) {
    return own
  }

  const params = Array.from(element?.parentElement?.querySelectorAll('param') ?? [])
  const named = params.find((param) => attr(param, 'name')?.toLowerCase() === 'flashvars')

  return attr(named, 'value')
}

// The first url in an element's inline `background-image`, for cards that paint their
// thumbnail with CSS instead of an `<img>`. Matches the url with or without quotes.
const bgImageUrlRegex = /url\(['"]?([^'")]+)/

export const bgImage = (element: Nullish<Element>): string | undefined => {
  return attr(element, 'style')?.match(bgImageUrlRegex)?.[1]
}

// Parsed value of an attribute holding a JSON blob, as several platforms ship whole cards
// or widget settings in one. Malformed JSON yields undefined instead of throwing.
export const jsonAttr = <Value>(element: Nullish<Element>, name: string): Value | undefined => {
  const raw = attr(element, name)

  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

export const isElement = (node: Node | null | undefined): node is Element => {
  return node?.nodeType === Node.ELEMENT_NODE
}

export const isText = (node: Node | null | undefined): node is Text => {
  return node?.nodeType === Node.TEXT_NODE
}

export const isComment = (node: Node | null | undefined): node is Comment => {
  return node?.nodeType === Node.COMMENT_NODE
}

export const hasText = (node: Node | null | undefined): boolean => {
  return isNonEmptyString(node?.textContent)
}

export const isWhitespaceText = (node: Node): boolean => {
  return isText(node) && !hasText(node)
}

export const isNonWhitespaceText = (node: Node): boolean => {
  return isText(node) && hasText(node)
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

// Elements that already play, or that already hold an assembled player, so a container
// wrapping one needs nothing recovered. Deliberately not `mediaElements`: `img` and `picture`
// are excluded because a poster image beside a parked media url is the common shape and
// skipping those would miss the recovery, and `source` is included because its presence means
// a player is already built around it.
export const playableElements = new Set(['audio', 'embed', 'iframe', 'object', 'source', 'video'])

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

// The registry of wrapper types this package generates — embed, cite and gallery
// placeholders, the table scroll wrapper, the code-block wrapper. A wrapper carries its
// contract in `data-{type}-*` attributes and its children are a fixed shape a consumer
// reads or replaces wholesale, so transforms that restructure containers treat it as
// opaque. createPlaceholder only accepts these types, so a new widget fails to compile
// until it is added here — and adding it makes the wrapper opaque everywhere at once.
// `table` and `pre` are not minted through the factory (wrapTablesForScroll and
// highlightCode set their attributes directly) and stay manual entries.
export const generatedWrapperTypes = ['embed', 'cite', 'gallery', 'table', 'pre'] as const

export type GeneratedWrapperType = (typeof generatedWrapperTypes)[number]

const generatedWrapperPrefixes = generatedWrapperTypes.map((type) => `data-${type}`)

export const isGeneratedWrapper = (element: Element): boolean => {
  return element.getAttributeNames().some((name) => startsWithAnyOf(name, generatedWrapperPrefixes))
}

// Matches `<prop>: <number>[px];` — px is optional, other units (em/rem/%) don't match.
// The numeric group gives each digit a single parse (`[0-9]+(?:\.[0-9]+)?|\.[0-9]+`, not
// `[0-9]*\.?[0-9]+`): the ambiguous form backtracks quadratically on a long digit run
// followed by a non-terminator, which `style` (an unbounded untrusted attribute) can carry.
const styleWidthRegex = /(?:^|;)\s*width\s*:\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*(?:px)?\s*(?:;|$)/i
const styleHeightRegex =
  /(?:^|;)\s*height\s*:\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*(?:px)?\s*(?:;|$)/i

// A pixel size as a player url or embed attribute states it: `200`, or `200px` where the
// publisher wrote the unit. `coerceNumber` alone will not do, because it reads neither the
// suffix nor a bound, and a stated height of `0` or `99999` is a mistake rather than a size.
// Two to four digits is what every player in `embeds/` needs and is a sane range for one.
//
// Deliberately not shared with `dimensionAttribute` below, which reads a declared width or
// height attribute and has the opposite requirement: removeTrackingPixels finds a tracking
// pixel by testing dimensions against `pixelDimensionLimit`, so `0`, `1` and `2` have to parse
// as numbers there. Routing that through this would make every tracking pixel undetectable.
const pixelSizeRegex = /^(\d{1,5})(?:px)?$/

// The range is stated as numbers rather than a digit count, which the resolvers had been using
// as a proxy for it. A count is a leaky one: `\d{2,4}` accepts `007` and `0000`, so the very
// values the bound exists to reject came through as 7 and 0.
const minimumPixelSize = 10
const maximumPixelSize = 9999

export const parsePixelSize = (value: Nullish<string>): number | undefined => {
  const digits = value?.trim().match(pixelSizeRegex)?.[1]

  if (!digits) {
    return
  }

  const size = Number(digits)

  return size >= minimumPixelSize && size <= maximumPixelSize ? size : undefined
}

// An empty or whitespace-only width/height attribute (`width=""`, common in editor output)
// is not a declared dimension; coerceNumber treats those as absent.
const dimensionAttribute = (element: Element, name: string): number | undefined => {
  return coerceNumber(element.getAttribute(name))
}

// Squarespace stamps the intrinsic size on `data-image-dimensions="2500x1695"`, and for
// its gallery images (`img.thumb-image`) that is the only place the size exists — the
// `src` is a resized CDN URL and there are no width/height attributes. It carries the same
// value as the real attributes when both are present, so it is read as their fallback.
const imageDimensionsRegex = /^\s*([0-9]+)\s*x\s*([0-9]+)\s*$/i

export const getElementDimensions = (element: Element): { width?: number; height?: number } => {
  const width = dimensionAttribute(element, 'width')
  const height = dimensionAttribute(element, 'height')

  if (width !== undefined && height !== undefined) {
    return { width, height }
  }

  // `data-image-dimensions` holds both sizes in one `WxH` attribute, so it is matched once
  // and each dimension picks its own capture group, the same way `style` is read once and
  // `fromStyle` picks each property.
  const dimensions = imageDimensionsRegex.exec(element.getAttribute('data-image-dimensions') ?? '')
  const style = element.getAttribute('style')

  const fromStyle = (regex: RegExp): number | undefined => {
    const match = style ? regex.exec(style) : null
    return match ? coerceNumber(match[1]) : undefined
  }

  return {
    width: width ?? coerceNumber(dimensions?.[1]) ?? fromStyle(styleWidthRegex),
    height: height ?? coerceNumber(dimensions?.[2]) ?? fromStyle(styleHeightRegex),
  }
}

// How many ancestors above the element to also check for a responsive wrapper.
const maxWrapperAncestorDepth = 3
// The ways an element can declare its aspect ratio. Every source reads the raw `style`
// or `class` attribute instead of the CSSOM API, because linkedom returns `undefined`
// for unset properties and both DOM parsers drop style declarations whose property name
// is not lowercase. A case-insensitive regex still matches those, the same way
// getElementDimensions reads its styles.
const elementRatioSources: Array<{
  attribute: string
  regex: RegExp
  extract: (match: RegExpExecArray) => { width: number; height: number } | undefined
}> = [
  {
    // Modern CSS: the whole `aspect-ratio` value (`16 / 9`, or a single number), parsed
    // like any other ratio string.
    attribute: 'style',
    regex: /aspect-ratio:\s*(?:auto\s+)?([\d.\s/]+)/i,
    extract: (match) => parseRatioDimensions(match[1]),
  },
  {
    // WordPress responsive embeds carry the ratio as a class (`wp-embed-aspect-16-9`),
    // styled by an external stylesheet feedsweep never sees; the class itself encodes it.
    attribute: 'class',
    regex: /wp-embed-aspect-(\d+)-(\d+)/,
    extract: (match) => parseRatioDimensions(`${match[1]}:${match[2]}`),
  },
  {
    // The legacy inline padding hack (`padding-bottom:56.25%`): the percent is the
    // inverse of the ratio, bounded to keep a stray value from encoding nonsense.
    attribute: 'style',
    regex: /padding-(?:bottom|top):\s*([\d.]+)%/i,
    extract: (match) => {
      const percent = Number(match[1])

      if (percent > 0 && percent < 1000) {
        return ratioDimensions(100 / percent)
      }
    },
  },
]

// The ratio dimensions a single element declares — via the `aspect-ratio` property, a
// `wp-embed-aspect-*` class, or the padding hack — or undefined.
const getElementRatioDimensions = (
  element: Element,
): { width: number; height: number } | undefined => {
  for (const source of elementRatioSources) {
    const match = source.regex.exec(element.getAttribute(source.attribute) ?? '')

    if (match) {
      const dimensions = source.extract(match)

      if (dimensions) {
        return dimensions
      }
    }
  }
}

// Walks the element and its ancestors (the element plus up to `maxDepth` levels) and returns the
// first ratio dimensions any of them declares — for an element whose own dimensions are unknown
// but which sits in a responsive wrapper. Only ascends into a parent that wraps this element
// alone: a parent with other element children sizes the whole group, so its ratio isn't this
// element's. Pass maxDepth 0 to read only the element itself.
export const getWrapperRatioDimensions = (
  element: Element,
  maxDepth = maxWrapperAncestorDepth,
): { width: number; height: number } | undefined => {
  let current: Element | null = element
  let depth = 0

  while (current && depth <= maxDepth) {
    const dimensions = getElementRatioDimensions(current)

    if (dimensions) {
      return dimensions
    }

    const parent: Element | null = current.parentElement

    if (!parent || parent.children.length > 1) {
      break
    }

    current = parent
    depth++
  }
}

// Encodes an aspect ratio as placeholder dimensions: the 100×N pair encodes the ratio, not
// absolute pixels. Private on purpose — every consumer wants the dimensions, never the raw
// ratio, so the parsers below are the only way in.
const ratioDimensions = (ratio: number): { width: number; height: number } => {
  return { width: 100, height: Math.round(100 / ratio) }
}

const ratioRegexes = [
  /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/, // 16:9, 690 : 362
  /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/, // 100/56, 690 / 362
  /^\s*([\d.]+)\s*$/, // 1.77777777777778, 1.5
]

// The one string-ratio grammar: a colon or slash width:height pair, or a bare decimal
// (a pair with an implied height of 1), returned as the encoded placeholder dimensions.
export const parseRatioDimensions = (
  value: string,
): { width: number; height: number } | undefined => {
  for (const regex of ratioRegexes) {
    const match = value.match(regex)

    if (!match) {
      continue
    }

    const width = Number(match[1])
    const height = match[2] === undefined ? 1 : Number(match[2])

    if (Number.isFinite(width) && width > 0 && height > 0) {
      return ratioDimensions(width / height)
    }
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

// Visits every element in document order and calls `visit` on each. Linkedom's
// querySelectorAll compiles its selector (via css-select) on every call, so
// replacing a per-document query with this walk avoids that repeated compile.
// Template subtrees are skipped, the same as querySelectorAll does. Return true
// from `visit` to stop early; walkElements then also returns true.
export const walkElements = (
  document: Document,
  visit: (element: Element) => boolean | undefined,
): boolean => {
  const stack: Array<Element> = []
  const root = document.documentElement

  if (root) {
    stack.push(root)
  }

  while (stack.length > 0) {
    const element = stack.pop() as Element

    if (visit(element) === true) {
      return true
    }

    if (element.localName === 'template') {
      continue
    }

    for (let child = element.lastElementChild; child; child = child.previousElementSibling) {
      stack.push(child)
    }
  }

  return false
}
