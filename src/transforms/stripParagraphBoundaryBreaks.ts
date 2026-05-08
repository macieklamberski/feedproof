import { isSkippable } from '../common.js'
import type { DomTransform } from '../types.js'

export const stripParagraphBoundaryBreaks: DomTransform = () => {
  return (document) => {
    const paragraphs = document.querySelectorAll('p')

    for (const paragraph of paragraphs) {
      while (paragraph.firstChild && isSkippable(paragraph.firstChild)) {
        paragraph.firstChild.remove()
      }

      while (paragraph.lastChild && isSkippable(paragraph.lastChild)) {
        paragraph.lastChild.remove()
      }
    }
  }
}
