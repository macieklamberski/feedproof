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

// Removes elements that have no non-whitespace text and no element children,
// looping implicitly via post-order traversal so nested empties collapse in
// one pass. Whitespace-only elements collapse to a single space text node so
// inline word boundaries survive. Media/void elements are kept regardless.
//
// Raw-text elements (`<script>`, `<style>`, `<textarea>`) and comments are
// handled by the parser — their bodies are a single text node or COMMENT_NODE,
// so the empty-check never mistakes tag-shaped text inside them for markup.
export const stripEmptyTags: DomTransform = () => {
  return (document) => {
    const all = [...document.body.querySelectorAll('*')]

    for (let i = all.length - 1; i >= 0; i--) {
      const element = all[i]

      if (!element.parentNode) {
        continue
      }

      const tagName = element.tagName.toLowerCase()

      if (preserveWhenEmpty.has(tagName)) {
        continue
      }

      // Custom elements (Web Components) always have a hyphen in their name.
      // Treat them like media/void elements — emptiness is meaningful
      // (typically a JS-target host), so leave them alone.
      if (tagName.includes('-')) {
        continue
      }

      let hasContent = false

      for (const child of element.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          hasContent = true
          break
        }

        if (child.nodeType === Node.TEXT_NODE && (child as Text).data.trim().length > 0) {
          hasContent = true
          break
        }
      }

      if (hasContent) {
        continue
      }

      if (element.childNodes.length > 0) {
        element.replaceWith(' ')
      } else {
        element.remove()
      }
    }
  }
}
