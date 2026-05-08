import { isBr, isSkippable } from '../common.js'
import type { DomTransform } from '../types.js'

export const stripParagraphBoundaryBreaks: DomTransform = () => {
  return (document) => {
    const paragraphs = document.querySelectorAll('p')

    for (const paragraph of paragraphs) {
      const leading: Array<ChildNode> = []
      let cursor = paragraph.firstChild

      while (cursor && isSkippable(cursor)) {
        leading.push(cursor)
        cursor = cursor.nextSibling
      }

      if (leading.some(isBr)) {
        for (const node of leading) {
          node.remove()
        }
      }

      const trailing: Array<ChildNode> = []
      cursor = paragraph.lastChild

      while (cursor && isSkippable(cursor)) {
        trailing.push(cursor)
        cursor = cursor.previousSibling
      }

      if (trailing.some(isBr)) {
        for (const node of trailing) {
          node.remove()
        }
      }
    }
  }
}
