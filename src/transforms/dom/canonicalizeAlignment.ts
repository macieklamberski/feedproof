import type { DomTransform } from '../../types.js'
import { isElement, isSkippable } from '../../utils/dom.js'
import * as styles from '../../utils/styles.js'

type Direction = 'center' | 'left' | 'right'

// No <picture>: flattenPictureElements dissolves it, so a hook set there is lost.
const mediaTags = new Set(['img', 'video', 'audio', 'iframe'])

// Structural media wrappers, always treated as part of the media (no media-primary
// gate): the responsive <picture>, the semantic <figure>, the click-through <a>.
const structuralWrapperTags = new Set(['picture', 'figure', 'a'])

// Generic block wrappers that count only when they wrap media and nothing else (a
// "media-primary" wrapper), e.g. classic-editor <p style="text-align:center"><img></p>.
// Inline text-align mostly sits on text, so only the media-primary slice is in scope.
const genericWrapperTags = new Set(['div', 'p', 'center'])

// WordPress block/editor classes: the dominant explicit media-alignment signal.
// `alignnone` is an explicit "no alignment" that terminates resolution without a hook.
const classDirections = new Map<string, Direction | 'none'>([
  ['aligncenter', 'center'],
  ['alignleft', 'left'],
  ['alignright', 'right'],
  ['alignnone', 'none'],
])

// No middle, top or bottom: those are vertical and would become a horizontal hook.
const attrDirections = new Map<string, Direction>([
  ['center', 'center'],
  ['left', 'left'],
  ['right', 'right'],
])

// Bare center, left and right classes align the media they sit on or wrap, as in
// <img class="center"> and <div class="center"><img></div>.
const bareClassDirections = new Map<string, Direction>([
  ['center', 'center'],
  ['left', 'left'],
  ['right', 'right'],
])

const whitespaceRegex = /\s+/

// The margin shorthand covers every side with one value, puts the horizontal pair second with
// two or three, and with four names the right second and the left fourth. A value holding a
// function carries spaces of its own that would count as sides.
const hasAutoHorizontalMargins = (element: Element): boolean => {
  if (
    styles.keyword(element, 'margin-left') === 'auto' &&
    styles.keyword(element, 'margin-right') === 'auto'
  ) {
    return true
  }

  const margin = styles.keyword(element, 'margin')

  if (!margin || margin.includes('(')) {
    return false
  }

  const sides = margin.split(whitespaceRegex)
  const right = sides.length === 1 ? sides[0] : sides[1]
  const left = sides.length === 4 ? sides[3] : right

  return right === 'auto' && left === 'auto'
}

const getStyleDirection = (element: Element, isImage: boolean): Direction | undefined => {
  const direction = attrDirections.get(styles.keyword(element, 'text-align') ?? '')

  if (direction) {
    return direction
  }

  // Auto horizontal margins center an <img> (a block layout idiom); ambiguous on
  // other elements, so restricted to images.
  if (isImage && hasAutoHorizontalMargins(element)) {
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

  if (element.localName === 'center') {
    return 'center'
  }

  const direction = getStyleDirection(element, element.localName === 'img')

  if (direction) {
    return direction
  }

  const align = element.getAttribute('align')

  if (align) {
    return attrDirections.get(align.toLowerCase())
  }
}

// A generic wrapper qualifies only when its meaningful content is the media we
// climbed from (plus optional sibling media) and nothing else: never prose.
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
  target: Element // Where the hook lands: the wrapping <figure>, else the media
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

// Media aligned by WordPress classes, an align attribute, <center> or inline style a reader strips.
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
