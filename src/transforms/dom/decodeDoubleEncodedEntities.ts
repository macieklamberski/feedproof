import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, isText, NodeFilter } from '../../utils/dom.js'

// Real elements whose entity-escaped contents are intentional text (a tutorial showing
// `&amp;`), so their descendants are left untouched.
const opaqueTags = new Set(['code', 'pre', 'script', 'style', 'textarea', 'noscript'])

// Only these doubled entities trigger a peel, so `&unknownEntity;` and other ampersand runs
// the author typed as text stay untouched.
const doubleEncodedEntityRegex = /&(amp|lt|gt|quot|apos|#x?[0-9a-f]+);/i

// Decodes entities that reached the HTML parser escaped twice, the leftover of CDATA content
// run through one escaping pass too many: the parser peels `&amp;amp;` to the visible text
// `&amp;`, so a reader shows `Tom &amp; Jerry` where the post said `Tom & Jerry`. Each
// qualifying text node is re-parsed once, so exactly one layer comes off per run.
export const decodeDoubleEncodedEntities: DomTransform = () => {
  return (document) => {
    document.body.normalize()

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let tempDiv: HTMLDivElement | null = null

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (!isText(node) || !node.data.includes('&')) {
        continue
      }

      if (!doubleEncodedEntityRegex.test(node.data)) {
        continue
      }

      if (hasAncestorWithTagName(node, opaqueTags)) {
        continue
      }

      if (tempDiv === null) {
        tempDiv = document.createElement('div')
      }

      // A literal `<` is re-escaped before the parse, so the peel only decodes entities and
      // never materializes elements; whether escaped markup becomes real elements is
      // decodeDoubleEncodedTags' call, with its whole-fragment and code-sample safeguards.
      tempDiv.innerHTML = node.data.replaceAll('<', '&lt;')
      node.data = tempDiv.textContent ?? ''
    }
  }
}
