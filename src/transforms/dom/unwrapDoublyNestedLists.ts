import { isSkippable, Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

export const unwrapDoublyNestedLists: DomTransform = () => {
  return (document) => {
    const lists = document.querySelectorAll('ul, ol')

    for (const outer of lists) {
      const childElements = [...outer.children]

      if (childElements.length !== 1) {
        continue
      }

      const wrapper = childElements[0]

      if (wrapper.tagName.toLowerCase() !== 'li') {
        continue
      }

      const significant = [...wrapper.childNodes].filter((node) => !isSkippable(node))

      if (significant.length !== 1) {
        continue
      }

      const inner = significant[0]

      if (inner.nodeType !== Node.ELEMENT_NODE) {
        continue
      }

      if ((inner as Element).tagName !== outer.tagName) {
        continue
      }

      outer.replaceWith(inner as Element)
    }
  }
}
