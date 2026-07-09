import type { DomTransform } from '../../types.js'
import { isNonWhitespaceText, isText } from '../../utils/dom.js'

export const unwrapDoublyNestedLists: DomTransform = () => {
  return (document) => {
    const lists = document.querySelectorAll('ul, ol')

    for (const outer of lists) {
      const wrapper = outer.firstElementChild
      if (wrapper === null || wrapper.nextElementSibling !== null) {
        continue
      }
      if (wrapper.localName !== 'li') {
        continue
      }

      const outerTag = outer.localName
      let inner: Element | null = null
      let elementDisqualified = false

      for (
        let element = wrapper.firstElementChild;
        element !== null;
        element = element.nextElementSibling
      ) {
        const localName = element.localName
        if (localName === 'br') {
          continue
        }
        if (inner !== null || localName !== outerTag) {
          elementDisqualified = true
          break
        }
        inner = element
      }

      if (elementDisqualified || inner === null) {
        continue
      }

      // Non-whitespace text in the wrapper would fuse adjacent words on unwrap.
      let textDisqualified = false
      for (let node = wrapper.firstChild; node !== null; node = node.nextSibling) {
        if (isNonWhitespaceText(node)) {
          textDisqualified = true
          break
        }
      }

      if (textDisqualified) {
        continue
      }

      const parent = outer.parentNode
      if (parent === null) {
        continue
      }
      for (let node = wrapper.firstChild; node !== null; ) {
        const next = node.nextSibling
        if (isText(node) || node === inner) {
          parent.insertBefore(node, outer)
        }
        node = next
      }
      outer.remove()
    }
  }
}
