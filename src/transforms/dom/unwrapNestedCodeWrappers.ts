import { isText } from '../../common.js'
import type { DomTransform } from '../../types.js'

// A <code> nested directly inside another <code> (or a <pre> inside a <pre>) is a redundant
// double-wrap some feeds emit. Readers size code with a relative font-size, so every extra
// nesting level shrinks the text. Collapse to one wrapper: when the inner element is its
// parent's sole child with no direct text that hoisting would fuse, lift the inner's children
// out and drop it. Deeper nesting collapses across iterations as each level is revisited.
export const unwrapNestedCodeWrappers: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll('code, pre')) {
      const parent = element.parentElement

      if (!parent || parent.localName !== element.localName || parent.childElementCount !== 1) {
        continue
      }

      let hasDirectText = false

      for (let node = parent.firstChild; node !== null; node = node.nextSibling) {
        if (isText(node) && node.textContent?.trim()) {
          hasDirectText = true
          break
        }
      }

      if (hasDirectText) {
        continue
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }

      element.remove()
    }
  }
}
