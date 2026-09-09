import type { DomTransform } from '../../types.js'
import { isComment, isElement, isWhitespaceText } from '../../utils/dom.js'

const isRule = (node: Node | null): boolean => {
  return isElement(node) && node.localName === 'hr'
}

// A run of <hr> elements separates nothing the first one has not already separated.
// An editor emits a separator twice over, or a stripped block leaves the rules around it touching.
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
