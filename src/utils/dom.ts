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

// Extraction helpers, used mainly by the cite resolvers to pull one field out of a card.
// Each accepts a nullable element and returns `undefined`, not `null` or `''`, so
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

// The inline `<script>` that configures a player sitting beside it, which several platforms use
// instead of an iframe. Two things make it awkward to reach. `wrapBareInlineInParagraphs` runs
// before the widget pass and puts a bare script in a `<p>`, so by then the player's sibling is
// that paragraph, not the script. And where one item holds several players, each script
// names its own container, so the element's id is what pairs them when they are not adjacent.
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

// A Flash player's configuration, which is where a `.swf` carrier names what it plays: the
// url is only the player. The value sits either on the carrier itself, which is how `<embed>`
// spells it, or in a sibling `<param name="flashvars">`, which is how `<object>` does. Both
// dialects appear on the same platform and often in the same snippet, so a reader that knows
// one of them reads half the corpus. Returned raw, because callers disagree about what it
// holds: a query string for Brightcove and Flickr, a config blob for Archive.
export const flashVars = (element: Nullish<Element>): string | undefined => {
  return attr(element, 'flashvars') ?? paramValue(element?.parentElement, 'flashvars')
}

// The value of a named `<param>` under `root`. Flash-era snippets carry their whole
// configuration this way, either beside the carrier for an `<object>` wrapper or, where the
// player is a script rather than a movie, inside the element itself. The name is matched
// case-insensitively because publishers spell it every way, so `name` arrives lowercased.
export const paramValue = (root: Nullish<Element>, name: string): string | undefined => {
  const params = Array.from(root?.querySelectorAll('param') ?? [])
  const named = params.find((param) => attr(param, 'name')?.toLowerCase() === name)

  return attr(named, 'value')
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

// An element a reader sees nothing of: no child elements and no text beyond whitespace.
// Attributes are not content, so an element carrying only a src or an href still counts as
// empty here. This is not the test stripEmptyTags applies, which keeps some empty elements
// and tells whitespace-only apart from no content at all.
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

// Elements that already play, or that already hold an assembled player, so a container
// wrapping one needs nothing recovered. Deliberately not `mediaElements`: `img` and `picture`
// are excluded because a poster image beside a parked media url is the common shape and
// skipping those would miss the recovery, and `source` is included because its presence means
// a player is already built around it.
export const playableElements = new Set(['audio', 'embed', 'iframe', 'object', 'source', 'video'])

// Collects a subtree's text nodes via an iterative depth-first walk (an explicit stack, not
// recursion) so a deeply nested document can't overflow the call stack. Children are pushed in
// reverse so they pop in document order. An element for which shouldPruneElement returns true
// prunes its whole subtree.
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

// The registry of wrapper types this package generates: embed and cite placeholders,
// the table scroll wrapper, the code-block wrapper. A wrapper carries its contract in
// `data-{type}-*` attributes and its children are a fixed shape a consumer reads or
// replaces wholesale, so transforms that restructure containers treat it as opaque.
// createPlaceholder only accepts these types, so a new widget fails to compile until it
// is added here, and adding it makes the wrapper opaque everywhere at once. `table` and
// `pre` are not minted through the factory (wrapTablesForScroll and highlightCode set
// their attributes directly) and stay manual entries.
export const generatedWrapperTypes = ['embed', 'cite', 'table', 'pre'] as const

export type GeneratedWrapperType = (typeof generatedWrapperTypes)[number]

const generatedWrapperPrefixes = generatedWrapperTypes.map((type) => `data-${type}`)

export const isGeneratedWrapper = (element: Element): boolean => {
  return element.getAttributeNames().some((name) => startsWithAnyOf(name, generatedWrapperPrefixes))
}

export const placeholderSelectors = ['[data-embed-provider]', '[data-cite-provider]']

// A pixel size as a player url or embed attribute states it: `200`, or `200px` where the
// publisher wrote the unit. `coerceNumber` alone will not do, because it reads neither the
// suffix nor a bound, and a stated height of `0` or `99999` is a mistake, not a size.
// The bound below is what every player in `embeds/` needs.
//
// Deliberately not shared with `dimensionAttribute` below, which reads a declared width or
// height attribute and has the opposite requirement: removeTrackingPixels finds a tracking
// pixel by testing dimensions against `pixelDimensionLimit`, so `0`, `1` and `2` have to parse
// as numbers there. Routing that through this would make every tracking pixel undetectable.
const pixelSizeRegex = /^(\d{1,5})(?:px)?$/

// The range is a pair of numbers, not a digit count. A count is a leaky proxy for one:
// `\d{2,4}` accepts `007` and `0000`, so the very values the bound exists to reject come
// through as 7 and 0.
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
// is not a declared dimension. coerceNumber treats those as absent. A trailing unit is dropped
// first and never converted, since a browser reads `height="900px"` and `height="900pt"` alike
// as 900 pixels, while `90%` stays unparsed.
const trailingUnitRegex = /\s*[a-z]+\s*$/i

const dimensionAttribute = (element: Element, name: string): number | undefined => {
  return coerceNumber(element.getAttribute(name)?.replace(trailingUnitRegex, ''))
}

// Squarespace stamps the intrinsic size on `data-image-dimensions="2500x1695"`, and for
// its gallery images (`img.thumb-image`) that is the only place the size exists: the
// `src` is a resized CDN URL and there are no width/height attributes. It carries the same
// value as the real attributes when both are present, so it is read as their fallback.
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
// `aspect-ratio` takes the ratio with an optional `auto` beside it, on either side.
const autoRatioRegex = /^auto\s+|\s+auto$/gi
const paddingPercentRegex = /^([\d.]+)%$/
const paddingSidesRegex = /\s+/
const wpEmbedAspectRegex = /wp-embed-aspect-(\d+)-(\d+)/

// The bottom padding as the `padding` shorthand states it, which some embed wrappers write the
// hack in (`padding: 0 0 56.25%`). Only the three and four value forms give the bottom a value of
// its own: one or two values pad every side alike, which is spacing rather than a shape. A value
// holding a function is left alone, since its own spaces would be counted as sides.
const shorthandBottom = (declarations: styles.Declarations): string | undefined => {
  const padding = declarations.padding

  if (!padding || padding.includes('(')) {
    return
  }

  const sides = padding.split(paddingSidesRegex)

  return sides.length >= 3 ? sides[2] : undefined
}

// The ways an element can declare its aspect ratio, in the order they are trusted.
const elementRatioSources: Array<(element: Element) => string | undefined> = [
  // Modern CSS: the whole `aspect-ratio` value (`16 / 9`, or a single number), parsed
  // like any other ratio string.
  (element) => {
    const ratio = styles.declarations(element)['aspect-ratio']

    return ratio ? parseRatio(ratio.replace(autoRatioRegex, '')) : undefined
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

  // A pair of caps (`max-width:800px;max-height:600px`). Neither is a size the element
  // takes, only the box it may not exceed, so together they encode a ratio and nothing
  // more. Last in this list because it is the weakest reading: anything above states a
  // ratio outright, while this one infers it. A real width or height never competes,
  // since getElementDimensions reads those and getEmbedSize consults this table only
  // when it found none.
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

// Walks the element and its ancestors (the element plus up to `maxDepth` levels) and returns the
// first aspect ratio any of them declares: for an element whose own dimensions are unknown but
// which sits in a responsive wrapper. Only ascends into a parent that wraps this element alone:
// a parent with other element children sizes the whole group, so its ratio isn't this element's.
// Pass maxDepth 0 to read only the element itself.
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

// A ratio written the way CSS wants it, `W/H`, from the numbers the source stated. Nothing is
// reduced or approximated: `800:600` stays `800/600`, and a bare decimal is written over one.
// CSS renders every spelling of a shape identically, so tidying one up buys a consumer nothing,
// while every attempt at it needed a threshold (a denominator bound, a tolerance, a digit count)
// where the output changed for reasons unrelated to the ratio.
export const formatRatio = (width: number, height = 1): string => {
  return `${width}/${height}`
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

// A width or height at or below this many pixels marks a tracking pixel, not real
// content. removeTrackingPixels strips images at or below it. resolveMediaDimensions
// won't promote a dimension at or below it.
export const pixelDimensionLimit = 2

// An element hidden from view: the `hidden` attribute, inline `display:none`, or
// inline `visibility:hidden`. These are unambiguous. Other "hidden" signals are
// overloaded and stay with their callers: `opacity:0` is usually a fade-in and
// `0×0` is the lazy-placeholder convention, both handled in removeTrackingPixels.
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

// Visits every element in document order and calls `visit` on each. Linkedom's
// querySelectorAll compiles its selector (via css-select) on every call, so
// replacing a per-document query with this walk avoids that repeated compile.
// Template subtrees are skipped, the same as querySelectorAll does. Return true
// from `visit` to stop early. walkElements then also returns true.
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
