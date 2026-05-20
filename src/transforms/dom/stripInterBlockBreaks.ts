import { isBlockElement, isBr, isSkippable } from '../../common.js'
import type { DomTransform } from '../../types.js'

export const stripInterBlockBreaks: DomTransform = () => {
  return (document) => {
    const brs = document.querySelectorAll('br')

    // Group by parent so each parent walks its children once, avoiding O(n²)
    // re-walks when many <br>s sit between the same boundaries.
    const parents = new Set<Node>()

    for (const br of brs) {
      const parent = br.parentNode

      if (parent) {
        parents.add(parent)
      }
    }

    for (const parent of parents) {
      let runBrs: Array<ChildNode> | null = null
      let previousBoundary: Node | null = null

      let child = parent.firstChild

      while (child !== null) {
        const nextChild = child.nextSibling

        if (isSkippable(child)) {
          if (isBr(child)) {
            if (runBrs === null) {
              runBrs = [child]
            } else {
              runBrs.push(child)
            }
          }
        } else {
          if (runBrs !== null) {
            const previousIsBlock = !previousBoundary || isBlockElement(previousBoundary)
            const nextIsBlock = isBlockElement(child)

            if (previousIsBlock && nextIsBlock) {
              for (const br of runBrs) {
                br.remove()
              }
            }

            runBrs = null
          }

          previousBoundary = child
        }

        child = nextChild
      }

      if (runBrs !== null) {
        const previousIsBlock = !previousBoundary || isBlockElement(previousBoundary)

        if (previousIsBlock) {
          for (const br of runBrs) {
            br.remove()
          }
        }
      }
    }
  }
}
