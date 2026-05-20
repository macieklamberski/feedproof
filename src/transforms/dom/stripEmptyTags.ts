import { Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

const preserveWhenEmpty = new Set([
  // Elements whose emptiness is meaningful (carry semantics via src etc.).
  'iframe',
  'video',
  'audio',
  'img',
  'source',
  // Void elements per HTML5 — cannot have content.
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'input',
  'link',
  'meta',
  'param',
  'track',
  'wbr',
])

// Removes elements with no non-whitespace text and no element children.
// Whitespace-only elements collapse to a single space text node so inline
// word boundaries survive. Reverse iteration handles nested empties in one pass.
export const stripEmptyTags: DomTransform = () => {
  return (document) => {
    const all = document.body.querySelectorAll('*')

    for (let i = all.length - 1; i >= 0; i--) {
      const element = all[i]

      if (!element.parentNode) {
        continue
      }

      const tagName = element.localName

      if (preserveWhenEmpty.has(tagName)) {
        continue
      }

      // Custom elements (Web Components) — emptiness is meaningful.
      if (tagName.includes('-')) {
        continue
      }

      const childNodes = element.childNodes
      const childCount = childNodes.length
      let hasContent = false

      for (let j = 0; j < childCount; j++) {
        const child = childNodes[j]
        const nodeType = child.nodeType

        if (nodeType === Node.ELEMENT_NODE) {
          hasContent = true
          break
        }

        if (nodeType === Node.TEXT_NODE && (child as Text).data.trim().length > 0) {
          hasContent = true
          break
        }
      }

      if (hasContent) {
        continue
      }

      if (childCount > 0) {
        element.replaceWith(' ')
      } else {
        element.remove()
      }
    }
  }
}
