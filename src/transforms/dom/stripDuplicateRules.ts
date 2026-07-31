import type { DomTransform } from '../../types.js'
import { isComment, isElement, isWhitespaceText } from '../../utils/dom.js'

const isRule = (node: Node | null): boolean => {
  return isElement(node) && node.localName === 'hr'
}

// A run of thematic breaks separates nothing the first one has not already separated, so
// only the first survives. Runs arrive two ways in roughly equal numbers: authored, where
// an editor emits a separator block twice over, and manufactured here, where a rule sits on
// each side of a block the pipeline strips and removing it leaves the two rules touching.
export const stripDuplicateRules: DomTransform = () => {
  return (document) => {
    for (const rule of document.querySelectorAll('hr')) {
      let previous = rule.previousSibling

      while (previous && (isWhitespaceText(previous) || isComment(previous))) {
        previous = previous.previousSibling
      }

      if (isRule(previous)) {
        rule.remove()
      }
    }
  }
}
