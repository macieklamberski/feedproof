import { isElement, isSkippable } from '../../common.js'
import type { DomTransform } from '../../types.js'

type Direction = 'center' | 'left' | 'right'

// Media elements that can receive a resolved alignment. <picture> is intentionally
// absent: it is climbed as a structural wrapper of its inner <img> and is dissolved
// by flattenPictureElements, so the hook must land on the img, not the <picture>.
const mediaTags = new Set(['img', 'video', 'audio', 'iframe'])

// Structural media wrappers, always treated as part of the media (no media-primary
// gate): the responsive <picture>, the semantic <figure>, the click-through <a>.
const structuralWrapperTags = new Set(['picture', 'figure', 'a'])

// Generic block wrappers that count only when they wrap media and nothing else (a
// "media-primary" wrapper), e.g. classic-editor <p style="text-align:center"><img></p>.
// <center> appears in 0.38% of feeds; inline text-align in 7.3% (mostly text — only the
// media-primary slice is in scope).
const genericWrapperTags = new Set(['div', 'p', 'center'])

// WordPress block/editor classes — the dominant explicit media-alignment signal.
// `alignnone` is an explicit "no alignment" that terminates resolution without a hook.
// Corpus feed shares (on an <img>): center 3.39%, left 1.88%, right 1.39%.
const classDirections = new Map<string, Direction | 'none'>([
  ['aligncenter', 'center'], // 154,871 feeds (5.7%); on <img> 91,757 (3.4%).
  ['alignleft', 'left'], // 72,307 feeds (2.7%); on <img> 50,936 (1.9%).
  ['alignright', 'right'], // 58,094 feeds (2.1%); on <img> 37,519 (1.4%).
  ['alignnone', 'none'], // 103,250 feeds (3.8%).
])

// Deprecated `align` attribute — horizontal values only. `middle`/`top`/`bottom`
// are vertical image alignment and must not map to a horizontal hook. On <img>:
// center 0.04%, left 0.18%, right 0.11%, middle 0.04% (excluded).
const attrDirections = new Map<string, Direction>([
  ['center', 'center'],
  ['left', 'left'],
  ['right', 'right'],
])

// Bare directional classes. Honored on a media element or a media-primary wrapper
// of it — never a standalone text block — where `center`/`left`/`right` unambiguously
// mean "align this media" (e.g. <img class="center">, <div class="center"><img></div>).
// resolve() only feeds getOwnDirection media-context elements, so the media-primary
// gate already prevents reading these off layout containers.
const bareClassDirections = new Map<string, Direction>([
  ['center', 'center'],
  ['left', 'left'],
  ['right', 'right'],
])

const whitespaceRegex = /\s+/
const textAlignRegex = /(?:^|;)\s*text-align\s*:\s*(center|left|right)\b/i
const autoMarginRegex = /(?:^|;)\s*margin\s*:\s*(?:0\s+)?auto\b/i
const autoMarginLeftRegex = /(?:^|;)\s*margin-left\s*:\s*auto\b/i
const autoMarginRightRegex = /(?:^|;)\s*margin-right\s*:\s*auto\b/i

const getStyleDirection = (style: string, isImage: boolean): Direction | undefined => {
  const match = textAlignRegex.exec(style)

  if (match) {
    return match[1].toLowerCase() as Direction
  }

  // Auto horizontal margins center an <img> (a block layout idiom); ambiguous on
  // other elements, so restricted to images. 0.16% of feeds.
  if (
    isImage &&
    (autoMarginRegex.test(style) ||
      (autoMarginLeftRegex.test(style) && autoMarginRightRegex.test(style)))
  ) {
    return 'center'
  }
}

// Resolves an element's own alignment signal, in type precedence: WP class, then
// inline style, then deprecated align attribute.
const getOwnDirection = (element: Element): Direction | 'none' | undefined => {
  const className = element.getAttribute('class')

  if (className) {
    const tokens = className.split(whitespaceRegex)

    for (const token of tokens) {
      const direction = classDirections.get(token)

      if (direction) {
        return direction
      }
    }

    for (const token of tokens) {
      const direction = bareClassDirections.get(token)

      if (direction) {
        return direction
      }
    }
  }

  // The <center> element is itself a center signal.
  if (element.localName === 'center') {
    return 'center'
  }

  const style = element.getAttribute('style')

  if (style) {
    const direction = getStyleDirection(style, element.localName === 'img')

    if (direction) {
      return direction
    }
  }

  const align = element.getAttribute('align')

  if (align) {
    return attrDirections.get(align.toLowerCase())
  }
}

// A generic wrapper qualifies only when its meaningful content is the media we
// climbed from (plus optional sibling media) and nothing else — never prose.
const isMediaPrimary = (wrapper: Element, inner: Element): boolean => {
  let hasContent = false

  for (const node of wrapper.childNodes) {
    if (node === inner) {
      hasContent = true
      continue
    }

    if (isSkippable(node)) {
      continue
    }

    if (isElement(node) && mediaTags.has(node.localName)) {
      hasContent = true
      continue
    }

    return false
  }

  return hasContent
}

type Resolution = {
  target: Element // Where the hook lands: the wrapping <figure>, else the media.
  direction: Direction
}

// Climbs from a media element through its structural and media-primary wrappers,
// returning the first concrete alignment found (innermost wins). A terminal
// `alignnone` or no signal yields undefined.
const resolve = (media: Element): Resolution | undefined => {
  let target: Element = media
  let node: Element | null = media

  while (node) {
    const direction = getOwnDirection(node)

    if (direction === 'none') {
      return
    }

    if (direction) {
      return { target, direction }
    }

    const parent: Element | null = node.parentElement

    if (parent && structuralWrapperTags.has(parent.localName)) {
      if (parent.localName === 'figure') {
        target = parent
      }
    } else if (
      !(parent && genericWrapperTags.has(parent.localName) && isMediaPrimary(parent, node))
    ) {
      return
    }

    node = parent
  }
}

// Canonicalizes explicit media alignment (WordPress align* classes, deprecated
// align attribute, <center>, inline text-align, image auto-margins) into a single
// data-align="center|left|right" hook on the media (or its <figure>). Purely
// additive: it only attaches the hook and never mutates the existing markup, so
// native rendering keeps working until a renderer adopts data-align. Text alignment
// on prose is left untouched. Runs before flattenPictureElements and unwrapWrappers
// so a signal on a soon-dissolved <picture>/<div> lands on the surviving media.
// Idempotent: a media element already carrying data-align is skipped.
export const canonicalizeAlignment: DomTransform = () => {
  return (document) => {
    for (const media of document.querySelectorAll('img, video, audio, iframe')) {
      if (media.hasAttribute('data-align')) {
        continue
      }

      const resolution = resolve(media)

      if (resolution && !resolution.target.hasAttribute('data-align')) {
        resolution.target.setAttribute('data-align', resolution.direction)
      }
    }
  }
}
