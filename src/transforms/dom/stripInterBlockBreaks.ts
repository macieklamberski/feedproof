import { isBlockElement, isBr, isMediaElement, isSkippable } from '../../common.js'
import type { DomTransform } from '../../types.js'

// A <br> is redundant beside anything that already breaks the flow: a block element
// or a block-displayed media element such as a bare image or video.
const separatesFlow = (node: Node): boolean => {
  return isBlockElement(node) || isMediaElement(node)
}

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
            const previousSeparates = !previousBoundary || separatesFlow(previousBoundary)
            const nextSeparates = separatesFlow(child)

            if (previousSeparates && nextSeparates) {
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
        const previousSeparates = !previousBoundary || separatesFlow(previousBoundary)

        if (previousSeparates) {
          for (const br of runBrs) {
            br.remove()
          }
        }
      }
    }
  }
}
