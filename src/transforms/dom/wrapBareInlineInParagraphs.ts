import type { DomTransform } from '../../types.js'
import {
  hasAncestorWithTagName,
  hasText,
  isBlockElement,
  isElement,
  isText,
} from '../../utils/dom.js'

const processContainersSelector =
  'body, div, blockquote, td, li, article, section, main, header, footer, aside, figure'

// Contexts where inline content sits directly, so wrapping it in a <p> would be
// wrong (captions, anchors, headings, raw-text blocks).
const inlineHostTags = new Set([
  'pre',
  'code',
  'figcaption',
  'a',
  'picture',
  'caption',
  'summary',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
])

const mediaSelector = 'img, picture, video, audio, iframe, embed, object'

// Standalone media at a run's edge (bare or wrapped in a textless anchor/span)
// renders as a block of its own. Pulling it into the text's paragraph would glue
// the text to it and hide it from media-specific styling.
const isMediaBoundary = (node: Node): boolean => {
  if (isText(node)) {
    return !hasText(node)
  }

  if (!isElement(node)) {
    return true
  }

  if (hasText(node)) {
    return false
  }

  return node.matches(mediaSelector) || node.querySelector(mediaSelector) !== null
}

// Wrappers unwrapWrappers later dissolves into a flow root. Their inline content
// would otherwise become bare text, so even a single full-container run is wrapped.
const dissolvingTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

// Persistent containers whose single-run inline content still needs paragraphs:
// body as the root flow, figure so its bare text (often a caption div dissolved
// by unwrapWrappers) gets an element to carry caption spacing and styling.
const alwaysWrapTags = new Set(['body', 'figure'])

// Block-boundary analogue of convertBreaksToParagraphs: wraps bare inline runs in
// <p> in place, leaving the wrapper for unwrapWrappers to hoist. Runs after
// convertBreaksToParagraphs (so <br><br> splits are already blocks) and before the
// strip passes (so the new <p>s' boundary <br>s get cleaned).
export const wrapBareInlineInParagraphs: DomTransform = () => {
  return (document) => {
    for (const container of document.querySelectorAll(processContainersSelector)) {
      if (hasAncestorWithTagName(container, inlineHostTags)) {
        continue
      }

      const children: Array<Node> = []
      let hasBlockChild = false

      for (let node = container.firstChild; node; node = node.nextSibling) {
        children.push(node)

        if (isBlockElement(node)) {
          hasBlockChild = true
        }
      }

      // Non-dissolving containers (li, td, blockquote, aside) only get paragraphs
      // when content is split by a block sibling. A plain single-run cell or item
      // is left as-is.
      const shouldWrap =
        alwaysWrapTags.has(container.localName) ||
        dissolvingTags.has(container.localName) ||
        hasBlockChild

      if (!shouldWrap) {
        continue
      }

      const newChildren: Array<Node> = []
      let buffer: Array<Node> = []
      let wrapped = false

      const flush = () => {
        if (buffer.length === 0) {
          return
        }

        const bufferHasText = buffer.some(hasText)

        if (bufferHasText) {
          let start = 0
          let end = buffer.length - 1

          while (isMediaBoundary(buffer[start])) {
            newChildren.push(buffer[start])
            start++
          }

          const trailing: Array<Node> = []

          while (isMediaBoundary(buffer[end])) {
            trailing.unshift(buffer[end])
            end--
          }

          const paragraph = document.createElement('p')

          for (let index = start; index <= end; index++) {
            paragraph.appendChild(buffer[index])
          }

          newChildren.push(paragraph, ...trailing)
          wrapped = true
        } else {
          // Media-only / whitespace / <br>-only runs stay bare.
          for (const node of buffer) {
            newChildren.push(node)
          }
        }

        buffer = []
      }

      for (const child of children) {
        if (isBlockElement(child)) {
          flush()
          newChildren.push(child)
        } else {
          buffer.push(child)
        }
      }

      flush()

      if (wrapped) {
        container.replaceChildren(...newChildren)
      }
    }
  }
}
