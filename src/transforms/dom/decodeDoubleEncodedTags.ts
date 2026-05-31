import { hasAncestorWithTagName, isText, NodeFilter } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Elements whose body is literal text — entity-decoded angle brackets here
// are content, not markup waiting to be rendered.
const opaqueTags = new Set(['code', 'pre', 'script', 'style', 'textarea', 'noscript'])

// Plain HTML text data never contains `<` (the parser intercepts it as a
// tag start), so a `<…>` pattern in a text node can only originate from
// entity references in the source.
const tagInTextRegex = /<\/?[a-zA-Z][\w-]*[^<>]*>/

// Decodes HTML tags double-encoded by buggy feed generators. Walks text
// nodes, re-parses any tag-shaped content via a throwaway container, and
// replaces the text node with the parsed elements.
export const decodeDoubleEncodedTags: DomTransform = () => {
  return (document) => {
    if (document.body.children.length === 0) {
      return
    }

    // linkedom splits text at each decoded `<`/`>`; merge adjacent text nodes
    // so each tag pattern lives in a single node we can re-parse atomically.
    document.body.normalize()

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let tempDiv: HTMLDivElement | null = null

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (!isText(node)) {
        continue
      }

      const data = node.data

      if (!data.includes('<') || !tagInTextRegex.test(data)) {
        continue
      }

      if (hasAncestorWithTagName(node, opaqueTags)) {
        continue
      }

      if (tempDiv === null) {
        tempDiv = document.createElement('div')
      }
      tempDiv.innerHTML = data
      node.replaceWith(...tempDiv.childNodes)
    }
  }
}
