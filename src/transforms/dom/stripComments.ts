import { Node, parseFragment } from '../../common.js'
import type { DomTransform } from '../../types.js'

const codeBlockTags = new Set(['pre', 'code'])

// CDATA-shaped comment: data is `[CDATA[ ... ]]` (with optional whitespace).
// Feeds sometimes wrap entire articles in `<!--[CDATA[ ... ]]-->`, which
// HTML5 parsers convert into a single bogus comment node. Removing such a
// "comment" would erase the article, so unwrap its content instead.
const cdataCommentPattern = /^\s*\[CDATA\[([\s\S]*?)\]\]\s*$/

// Removes HTML comments from feed content. Comments are typically authoring
// noise (editor scaffolding, tracking markers, conditional-comment leftovers)
// that adds no value to the rendered output and can interfere with downstream
// DOM traversal. Preserves comments inside <pre> and <code> blocks because
// those usually contain tutorial markup where the comment is part of the
// example. Unwraps CDATA-shaped comments rather than dropping them, since
// their content is real article HTML that just happened to be wrapped in a
// CDATA pseudo-marker that HTML5 misparses as a comment.
export const stripComments: DomTransform = () => {
  return (document) => {
    const visit = (node: Node, inCodeBlock: boolean) => {
      // Snapshot children before iterating because removal mutates the live list.
      const children = Array.from(node.childNodes)

      for (const child of children) {
        if (child.nodeType === Node.COMMENT_NODE) {
          if (inCodeBlock) {
            continue
          }

          const data = (child as Comment).data ?? ''
          const cdataMatch = cdataCommentPattern.exec(data)

          if (cdataMatch) {
            const parent = child.parentNode

            if (parent) {
              const innerDoc = parseFragment(cdataMatch[1])
              const innerNodes = Array.from(innerDoc.body.childNodes)

              for (const innerChild of innerNodes) {
                parent.insertBefore(innerChild, child)
              }
            }
          }

          child.remove()
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
