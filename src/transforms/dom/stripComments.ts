import { Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

const codeBlockTags = new Set(['pre', 'code'])

// Removes HTML comments from feed content. Comments are typically authoring
// noise (editor scaffolding, tracking markers, conditional-comment leftovers)
// that adds no value to the rendered output and can interfere with downstream
// DOM traversal. Preserves comments inside <pre> and <code> blocks because
// those usually contain tutorial markup where the comment is part of the
// example.
export const stripComments: DomTransform = () => {
  return (document) => {
    const visit = (node: Node, inCodeBlock: boolean) => {
      // Snapshot children before iterating because removal mutates the live list.
      const children = Array.from(node.childNodes)

      for (const child of children) {
        if (child.nodeType === Node.COMMENT_NODE) {
          if (!inCodeBlock) {
            child.remove()
          }
          continue
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as Element
          visit(element, inCodeBlock || codeBlockTags.has(element.tagName.toLowerCase()))
        }
      }
    }

    visit(document.body, false)
  }
}
