import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, NodeFilter } from '../../utils/dom.js'

const codeBlockTags = new Set(['pre', 'code'])

// Removes HTML comments from feed content. Preserves comments inside <pre> and
// <code> blocks since those usually contain tutorial markup where the comment
// is part of the example.
export const stripComments: DomTransform = () => {
  return (document) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
    const comments: Array<ChildNode> = []

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      comments.push(node as unknown as ChildNode)
    }

    for (const comment of comments) {
      if (!hasAncestorWithTagName(comment, codeBlockTags, document.body)) {
        comment.remove()
      }
    }
  }
}
