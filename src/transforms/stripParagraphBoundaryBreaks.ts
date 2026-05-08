import { isSkippable } from '../common.js'
import type { DomTransform } from '../types.js'

export const stripParagraphBoundaryBreaks: DomTransform = () => {
  return (document) => {
    for (const paragraph of document.querySelectorAll('p')) {
      while (paragraph.firstChild && isSkippable(paragraph.firstChild)) {
        paragraph.firstChild.remove()
      }

      while (paragraph.lastChild && isSkippable(paragraph.lastChild)) {
        paragraph.lastChild.remove()
      }
    }
  }
}
