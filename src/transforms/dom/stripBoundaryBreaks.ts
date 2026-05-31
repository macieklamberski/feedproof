import { isBr, isSkippable } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Flow-content blocks where a boundary <br> is redundant. Structural
// members (td, th, dt, dd) are omitted: emptying one (e.g. <td><br></td>)
// lets stripEmptyTags delete it, misaligning tables / breaking dl pairs.
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
  'figcaption',
  'section',
]

export const stripBoundaryBreaks: DomTransform = () => {
  return (document) => {
    const elements = document.querySelectorAll(boundaryBreakSelectors.join(', '))

    for (const element of elements) {
      let cursor = element.firstChild
      let leadingHasBr = false
      let leadingEnd: ChildNode | null = null

      while (cursor && isSkippable(cursor)) {
        if (!leadingHasBr && isBr(cursor)) {
          leadingHasBr = true
        }
        leadingEnd = cursor
        cursor = cursor.nextSibling
      }

      if (leadingHasBr) {
        let node = element.firstChild
        while (node) {
          const next = node.nextSibling
          node.remove()
          if (node === leadingEnd) {
            break
          }
          node = next
        }
      }

      cursor = element.lastChild
      let trailingHasBr = false
      let trailingEnd: ChildNode | null = null

      while (cursor && isSkippable(cursor)) {
        if (!trailingHasBr && isBr(cursor)) {
          trailingHasBr = true
        }
        trailingEnd = cursor
        cursor = cursor.previousSibling
      }

      if (trailingHasBr) {
        let node = element.lastChild
        while (node) {
          const prev = node.previousSibling
          node.remove()
          if (node === trailingEnd) {
            break
          }
          node = prev
        }
      }
    }
  }
}
