import { isBlockElement, isSkippable } from '../common.js'
import type { DomTransform } from '../types.js'

export const stripInterBlockBreaks: DomTransform = () => {
  return (document) => {
    for (const br of [...document.querySelectorAll('br')]) {
      let previous = br.previousSibling

      while (previous && isSkippable(previous)) {
        previous = previous.previousSibling
      }

      let next = br.nextSibling

      while (next && isSkippable(next)) {
        next = next.nextSibling
      }

      const previousIsBlock = !previous || isBlockElement(previous)
      const nextIsBlock = !next || isBlockElement(next)

      if (previousIsBlock && nextIsBlock) {
        br.remove()
      }
    }
  }
}
