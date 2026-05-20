import { isBr, isSkippable } from '../../common.js'
import type { DomTransform } from '../../types.js'

export const stripParagraphBoundaryBreaks: DomTransform = () => {
  return (document) => {
    const paragraphs = document.querySelectorAll('p')

    for (const paragraph of paragraphs) {
      let cursor = paragraph.firstChild
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
        let node = paragraph.firstChild
        while (node) {
          const next = node.nextSibling
          node.remove()
          if (node === leadingEnd) {
            break
          }
          node = next
        }
      }

      cursor = paragraph.lastChild
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
        let node = paragraph.lastChild
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
