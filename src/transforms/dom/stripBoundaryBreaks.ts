import type { DomTransform } from '../../types.js'
import { isBlockElement, isBr, isComment, isElement, isWhitespaceText } from '../../utils/dom.js'

// Adding td, th, dt or dd empties cells that stripEmptyTags then deletes, misaligning the table.
// An emptied dt or dd breaks its dl pair the same way.
const boundaryBreakSelectors = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'div',
  'blockquote',
  'li',
  'ul',
  'ol',
  'figcaption',
  'section',
]

const isInlineWrapper = (node: Node): boolean => {
  return isElement(node) && !isBlockElement(node) && !isBr(node)
}

// True when only whitespace/comments/<br> remain, so the wrapper carries no
// visible content and the boundary walk can treat it as transparent.
const isVisuallyEmpty = (node: Node): boolean => {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (isWhitespaceText(child) || isComment(child) || isBr(child)) {
      continue
    }

    return false
  }

  return true
}

// Without the cap a pathologically nested document overflows the call stack.
// Real content never nests inline wrappers anywhere near this deep.
const maxEdgeWrapperDepth = 200

// Strip boundary <br>s from one edge of `container`, descending through inline
// wrappers. A buffered run of skippables (whitespace, comments, <br>) is removed
// only when it actually contained a <br>, so whitespace alone is left intact.
const stripEdge = (container: Node, trailing: boolean, depth = 0): void => {
  if (depth > maxEdgeWrapperDepth) {
    return
  }

  let node = trailing ? container.lastChild : container.firstChild
  let sawBr = false
  let pending: Array<ChildNode> = []

  const removePending = () => {
    if (sawBr) {
      for (const item of pending) {
        item.remove()
      }
    }
  }

  while (node) {
    const next = trailing ? node.previousSibling : node.nextSibling

    if (isWhitespaceText(node) || isComment(node)) {
      pending.push(node)
      node = next
      continue
    }

    if (isBr(node)) {
      sawBr = true
      pending.push(node)
      node = next
      continue
    }

    if (isInlineWrapper(node)) {
      removePending()
      pending = []
      sawBr = false
      stripEdge(node, trailing, depth + 1)

      // An emptied wrapper is transparent: keep walking outward past it.
      if (isVisuallyEmpty(node)) {
        node = next
        continue
      }

      return
    }

    // Real content (non-whitespace text or a block element): stop here.
    removePending()
    return
  }

  // Reached the edge: the whole container is skippable.
  removePending()
}

// A <br> at the start or end of a block doubles the line break the block edge already renders.
export const stripBoundaryBreaks: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll(boundaryBreakSelectors.join(', '))) {
      stripEdge(element, false)
      stripEdge(element, true)
    }
  }
}
