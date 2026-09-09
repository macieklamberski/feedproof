import type { DomTransform } from '../../types.js'
import { isNonWhitespaceText } from '../../utils/dom.js'

const hasDirectText = (element: Element): boolean => {
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (isNonWhitespaceText(node)) {
      return true
    }
  }

  return false
}

// Styling wrappers some highlighters put around the <code> inside a <pre>: WordPress's
// Highlighting Code Block emits <pre><span><code>. Anything else (a link, a figure) may
// carry meaning of its own and stays.
const styleWrapperTags = new Set(['span', 'div'])

// A <code> in a <code>, or a span between <pre> and <code>: shrunk text or broken scrolling.
// Readers size code with a relative font-size and scroll it through a `pre > code` selector.
export const unwrapNestedCodeWrappers: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll('code, pre')) {
      const parent = element.parentElement

      if (!parent || parent.localName !== element.localName || parent.childElementCount !== 1) {
        continue
      }

      if (hasDirectText(parent)) {
        continue
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }

      element.remove()
    }

    for (const code of document.querySelectorAll('pre code')) {
      let wrapper = code.parentElement

      while (
        wrapper?.parentElement &&
        styleWrapperTags.has(wrapper.localName) &&
        wrapper.childElementCount === 1 &&
        !hasDirectText(wrapper)
      ) {
        const parent = wrapper.parentElement

        while (wrapper.firstChild) {
          parent.insertBefore(wrapper.firstChild, wrapper)
        }

        wrapper.remove()
        wrapper = code.parentElement
      }
    }
  }
}
