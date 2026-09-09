import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, NodeFilter } from '../../utils/dom.js'

// A comment inside <pre> or <code> is part of the example it sits in.
const codeBlockTags = new Set(['pre', 'code'])

// An HTML comment is editor residue that renders nothing and only bloats the item.
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
