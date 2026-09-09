import { coerceNumber, isNonEmptyString, type Nullish, startsWithAnyOf } from 'trousse'
import * as styles from './styles.js'

// Linkedom mis-types Node as `() => void` in facades.d.ts (WebReflection/linkedom#167).
export const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 } as const

// NodeFilter is not globally available in Bun. These are the DOM-spec constants.
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

export const text = (element: Nullish<Element>, selector?: string): string | undefined => {
  const target = selector ? find(element, selector) : element

  return target?.textContent?.trim() || undefined
}

// Text of the element's direct text-node children only, ignoring text inside nested elements.
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

// Several platforms configure a player from an inline <script> beside it, with no iframe.
// An earlier pass wraps a bare script in a <p>, so the player's sibling may be that paragraph.
// Where one item holds several players, each script names its container, so the id pairs them.
export const findConfigScript = (element: Element): Element | undefined => {
  const sibling = element.nextElementSibling

  if (sibling?.localName === 'script') {
    return sibling
  }

  const wrapped = sibling?.querySelector('script')

  if (wrapped) {
    return wrapped
  }

  if (!element.id) {
    return
  }

  for (const script of element.parentElement?.querySelectorAll('script') ?? []) {
    if (script.textContent?.includes(element.id)) {
      return script
    }
  }
}

export const attr = (element: Nullish<Element>, name: string): string | undefined => {
  return element?.getAttribute(name)?.trim() || undefined
}

// Keeps a value read out of an attribute or a url when it fits the shape expected of it, an id,
// a handle or a token, and drops it otherwise, so nothing malformed reaches a minted url.
export const keepIfMatches = (value: Nullish<string>, regex: RegExp): string | undefined => {
  return value && regex.test(value) ? value : undefined
}

// A `.swf` carrier names what it plays in flashvars, an attribute on `<embed>` and a sibling
// `<param name="flashvars">` under `<object>`. Brightcove and Flickr write it as a query string,
// Archive as a config blob.
export const flashVars = (element: Nullish<Element>): string | undefined => {
  return attr(element, 'flashvars') ?? paramValue(element?.parentElement, 'flashvars')
}

// One named value out of that configuration, for a carrier that names a single thing.
export const flashVar = (element: Nullish<Element>, name: string): string | undefined => {
  return new URLSearchParams(flashVars(element)).get(name) ?? undefined
}

// Publishers spell a `<param>` name in every case, so `name` arrives lowercased.
export const paramValue = (root: Nullish<Element>, name: string): string | undefined => {
  const params = Array.from(root?.querySelectorAll('param') ?? [])
  const named = params.find((param) => attr(param, 'name')?.toLowerCase() === name)

  return attr(named, 'value')
}

// Several platforms ship a whole card or widget settings as JSON in one attribute.
export const jsonAttr = <Value>(element: Nullish<Element>, name: string): Value | undefined => {
  const raw = attr(element, name)

  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

// SVG2 spells it `href`, SVG1 `xlink:href`.
// jsdom matches `[href]` on an element carrying only `xlink:href`, so a selector would drop SVG1.
export const svgHrefAttribute = (element: Element): string => {
  return element.hasAttribute('href') ? 'href' : 'xlink:href'
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

export const isEmptyElement = (element: Element): boolean => {
  return element.children.length === 0 && !hasText(element)
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

    if (!isEmptyElement(parent)) {
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

// No img or picture here: a poster beside a parked media url would otherwise count as a player.
export const playableElements = new Set(['audio', 'embed', 'iframe', 'object', 'source', 'video'])

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

export const generatedWrapperTypes = ['embed', 'cite', 'table', 'pre'] as const

export type GeneratedWrapperType = (typeof generatedWrapperTypes)[number]

const generatedWrapperPrefixes = generatedWrapperTypes.map((type) => `data-${type}`)

export const isGeneratedWrapper = (element: Element): boolean => {
  return element.getAttributeNames().some((name) => startsWithAnyOf(name, generatedWrapperPrefixes))
}

export const placeholderSelectors = ['[data-embed-provider]', '[data-cite-provider]']

// A player url or embed attribute states `200`, or `200px` where the publisher wrote the unit.
// Not shared with dimensionAttribute: removeTrackingPixels needs 0, 1 and 2 to parse there.
const pixelSizeRegex = /^(\d{1,5})(?:px)?$/

// A digit count in the regex would pass `007` and `0000`, the values the bound exists to reject.
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

// A browser reads `height="900px"` and `height="900pt"` alike as 900 pixels. Editor output often
// writes `width=""`, which states no dimension.
// Nothing is matched ahead of the unit: an unbounded run there is quadratic on a long attribute.
const trailingUnitRegex = /[a-z]{1,6}\s*$/i

const dimensionAttribute = (element: Element, name: string): number | undefined => {
  return coerceNumber(element.getAttribute(name)?.replace(trailingUnitRegex, ''))
}

// Squarespace stamps `data-image-dimensions="2500x1695"`, and on its gallery `img.thumb-image`
// that is the only place the size exists.
const imageDimensionsRegex = /^\s*([0-9]+)\s*x\s*([0-9]+)\s*$/i

export const getElementDimensions = (element: Element): { width?: number; height?: number } => {
  const width = dimensionAttribute(element, 'width')
  const height = dimensionAttribute(element, 'height')

  if (width !== undefined && height !== undefined) {
    return { width, height }
  }

  const dimensions = imageDimensionsRegex.exec(element.getAttribute('data-image-dimensions') ?? '')

  return {
    width: width ?? coerceNumber(dimensions?.[1]) ?? coerceNumber(styles.pixels(element, 'width')),
    height:
      height ?? coerceNumber(dimensions?.[2]) ?? coerceNumber(styles.pixels(element, 'height')),
  }
}

// How many ancestors above the element to also check for a responsive wrapper.
const maxWrapperAncestorDepth = 3
const paddingPercentRegex = /^([\d.]+)%$/
const whitespaceRegex = /\s+/
const wpEmbedAspectRegex = /wp-embed-aspect-(\d+)-(\d+)/

// Some embed wrappers write the hack as `padding: 0 0 56.25%`, where only the three and four
// value forms give the bottom a value of its own.
const shorthandBottom = (declarations: styles.Declarations): string | undefined => {
  const padding = declarations.padding

  if (!padding || padding.includes('(')) {
    return
  }

  const sides = padding.split(whitespaceRegex)

  return sides.length >= 3 ? sides[2] : undefined
}

// Ordered by trust, the max-width pair last: it infers a ratio the others state outright.
const elementRatioSources: Array<(element: Element) => string | undefined> = [
  // CSS allows `auto` beside the ratio, on either side.
  (element) => {
    const ratio = styles.declarations(element)['aspect-ratio']

    if (!ratio) {
      return
    }

    const stated = ratio.split(whitespaceRegex).filter((token) => token.toLowerCase() !== 'auto')

    return parseRatio(stated.join(' '))
  },

  // WordPress responsive embeds carry the ratio as a class (`wp-embed-aspect-16-9`),
  // styled by an external stylesheet feedsweep never sees. The class itself encodes it.
  (element) => {
    const match = wpEmbedAspectRegex.exec(element.getAttribute('class') ?? '')

    return match ? parseRatio(`${match[1]}:${match[2]}`) : undefined
  },

  // The legacy inline padding hack (`padding-bottom:56.25%`): the percent is the
  // inverse of the ratio, bounded to keep a stray value from encoding nonsense.
  (element) => {
    const declarations = styles.declarations(element)
    const padding =
      declarations['padding-bottom'] ?? declarations['padding-top'] ?? shorthandBottom(declarations)
    const percent = Number(padding?.match(paddingPercentRegex)?.[1])

    if (percent > 0 && percent < 1000) {
      return formatRatio(100, percent)
    }
  },

  (element) => {
    const width = styles.pixels(element, 'max-width')
    const height = styles.pixels(element, 'max-height')

    return width && height ? parseRatio(`${width}:${height}`) : undefined
  },
]

const getElementRatio = (element: Element): string | undefined => {
  for (const source of elementRatioSources) {
    const ratio = source(element)

    if (ratio) {
      return ratio
    }
  }
}

export const getWrapperRatio = (
  element: Element,
  maxDepth = maxWrapperAncestorDepth,
): string | undefined => {
  let current: Element | null = element
  let depth = 0

  while (current && depth <= maxDepth) {
    const ratio = getElementRatio(current)

    if (ratio) {
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

// Not reduced: CSS renders `800/600` and `4/3` alike, and every reduction needed a threshold.
export const formatRatio = (width: number, height = 1): string => {
  return `${width}/${height}`
}

// Both under 100, a pair is a ratio, not a box: AMP states one as `width="16" height="9"`.
// Both, because a fixed-height bar like archive.org's 350x30 states a real width and is a box.
const shapeCeiling = 100

export const getPairRatio = (
  width: number | undefined,
  height: number | undefined,
): string | undefined => {
  if (!width || !height || width >= shapeCeiling || height >= shapeCeiling) {
    return
  }

  return formatRatio(width, height)
}

const styleLengthRegex = /^(\d+)(?:px)?$/

const readStyleLength = (value: string | undefined): number | undefined => {
  const digits = value?.match(styleLengthRegex)?.[1]

  return digits === undefined ? undefined : Number(digits)
}

// The inline-style spelling of the pair above. Read only where the element states no
// `width`/`height` attribute of its own, since those are the more direct claim and getEmbedSize
// puts them through the same rule.
export const getStylePairRatio = (element: Element): string | undefined => {
  if (element.hasAttribute('width') || element.hasAttribute('height')) {
    return
  }

  const declarations = styles.declarations(element)

  return getPairRatio(readStyleLength(declarations.width), readStyleLength(declarations.height))
}

const ratioRegexes = [
  /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/, // 16:9, 690 : 362
  /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/, // 100/56, 690 / 362
  /^\s*([\d.]+)\s*$/, // 1.77777777777778, 1.5
]

// The one string-ratio grammar: a colon or slash width:height pair, or a bare decimal
// (a pair with an implied height of 1), returned in the `W/H` spelling.
export const parseRatio = (value: string): string | undefined => {
  for (const regex of ratioRegexes) {
    const match = value.match(regex)

    if (!match) {
      continue
    }

    const width = Number(match[1])
    const height = match[2] === undefined ? 1 : Number(match[2])

    if (Number.isFinite(width) && width > 0 && height > 0) {
      return formatRatio(width, height)
    }
  }
}

// A width or height at or below this marks a tracking pixel.
export const pixelDimensionLimit = 2

// opacity:0 stays out: off an image it is usually the first frame of a fade-in.
export const isElementHidden = (element: Element): boolean => {
  if (element.hasAttribute('hidden')) {
    return true
  }

  return (
    styles.keyword(element, 'display') === 'none' ||
    styles.keyword(element, 'visibility') === 'hidden'
  )
}

// Kept out of isElementHidden because it only means hidden on an image, where it is a
// tracking-beacon trick. Elsewhere `opacity:0` is usually the first frame of a fade-in,
// so the caller decides what it is looking at.
export const hasZeroOpacity = (element: Element): boolean => {
  return styles.number(element, 'opacity') === 0
}

// Linkedom compiles the selector on every querySelectorAll call, which this walk avoids.
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
