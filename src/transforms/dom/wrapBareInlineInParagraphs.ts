import { hasAncestorWithTagName, isBlockElement } from '../../common.js'
import type { DomTransform } from '../../types.js'

const processContainersSelector =
  'body, div, blockquote, td, li, article, section, main, header, footer, aside'

// Contexts where inline content sits directly, so wrapping it in a <p> would be
// wrong (captions, anchors, headings, raw-text blocks).
const inlineHostTags = new Set([
  'pre',
  'code',
  'figure',
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

// Wrappers unwrapWrappers later dissolves into a flow root; their inline content
// would otherwise become bare text, so even a single full-container run is wrapped.
const dissolvingTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

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
      // when content is split by a block sibling; a plain single-run cell or item
      // is left as-is, mirroring convertBreaksToParagraphs' single-chunk skip.
      const shouldWrap =
        container.localName === 'body' || dissolvingTags.has(container.localName) || hasBlockChild

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

        const hasText = buffer.some((node) => node.textContent?.trim())

        if (hasText) {
          const paragraph = document.createElement('p')

          for (const node of buffer) {
            paragraph.appendChild(node)
          }

          newChildren.push(paragraph)
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
