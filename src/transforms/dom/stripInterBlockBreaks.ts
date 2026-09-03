import type { DomTransform } from '../../types.js'
import { isBlockElement, isBr, isElement, isMediaElement, isSkippable } from '../../utils/dom.js'
import { emojiImageAttribute } from './unwrapEmojiImages.js'

// An emoji image keeps its picture but is sized like text, so it sits inside the line
// instead of ending it and the <br> after it is a break the author meant.
const isEmojiImage = (node: Node): boolean => {
  return isElement(node) && node.hasAttribute(emojiImageAttribute)
}

// A media element renders on its own line, and so does an inline wrapper holding
// nothing but one: a linked image is the common case.
const isMediaBlock = (node: Node): boolean => {
  if (isMediaElement(node)) {
    return !isEmojiImage(node)
  }

  if (!isElement(node) || isBlockElement(node)) {
    return false
  }

  let media = false

  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (isSkippable(child)) {
      continue
    }

    if (media || !isMediaElement(child) || isEmojiImage(child)) {
      return false
    }

    media = true
  }

  return media
}

// A <br> is redundant beside anything that already breaks the flow: a block element
// or a block-displayed media element such as a bare image or video.
const separatesFlow = (node: Node): boolean => {
  return isBlockElement(node) || isMediaBlock(node)
}

// A <br> directly inside a table's structure is a break the author wrote between rows or
// cells. A spec parser foster-parents it out in front of the table, where the block walk
// below removes it; linkedom leaves it in place, so it is removed here first.
const tableStructureBrSelector =
  'table > br, colgroup > br, thead > br, tbody > br, tfoot > br, tr > br'

export const stripInterBlockBreaks: DomTransform = () => {
  return (document) => {
    for (const br of document.querySelectorAll(tableStructureBrSelector)) {
      br.remove()
    }

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

            // Media only breaks the line because readers display it as a block, so the
            // author's own <br> after it doubles the break whatever follows. After a real
            // block the break was already redundant in the source, so it stays as intended.
            const previousIsMedia = previousBoundary !== null && isMediaBlock(previousBoundary)

            if (previousIsMedia || (previousSeparates && nextSeparates)) {
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
