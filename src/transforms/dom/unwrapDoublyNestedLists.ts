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

      // Replace the outer list with the inner one PLUS the wrapper's text
      // children (whitespace and `&nbsp;`). Those text nodes contributed
      // visible word-separator spacing in the original `body.textContent`;
      // dropping them would fuse adjacent words. Comments and `<br>` siblings
      // are intentionally dropped — they don't contribute to textContent.
      const replacement = [...wrapper.childNodes].filter(
        (node) => node === inner || node.nodeType === Node.TEXT_NODE,
      )
      outer.replaceWith(...replacement)
    }
  }
}
