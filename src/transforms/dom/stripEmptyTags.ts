import type { DomTransform } from '../../types.js'
import { isBlockElement, isElement, isGeneratedWrapper, isText } from '../../utils/dom.js'

// Structural cells and definition terms whose slot must survive even when empty,
// so table columns and definition-list pairs stay aligned. Never dropped or collapsed.
const structuralTags = new Set(['td', 'th', 'tr', 'dt', 'dd'])

const preserveWhenEmpty = new Set([
  // Elements whose emptiness is meaningful (carry semantics via src etc.).
  'iframe',
  'video',
  'audio',
  'img',
  'source',
  // Void elements per HTML5: cannot have content.
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

// Removes elements with no non-whitespace text and no element children. A
// whitespace-only block (e.g. a `<div>&nbsp;</div>` spacer) is removed. A
// whitespace-only inline element is unwrapped to its own whitespace, so a word
// boundary survives in normal flow (the browser collapses it) while significant
// indentation inside <pre> (e.g. a Pygments `<span class="w">    </span>` token)
// is preserved. Reverse iteration handles nested empties in one pass.
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

      // Custom elements (Web Components): emptiness is meaningful.
      if (tagName.includes('-')) {
        continue
      }

      // An embed placeholder holds nothing but its `data-embed-*` attributes, which is the
      // whole widget: a consumer renders it from those.
      if (isGeneratedWrapper(element)) {
        continue
      }

      // Empty elements carrying an id or name are in-page anchor / ARIA targets
      // (`<a name="x">`, `<span id="x">`, …). Other content links to them via
      // `#fragment` or `aria-*`. Removing them breaks that navigation, so keep
      // them even when empty.
      if (element.hasAttribute('id') || element.hasAttribute('name')) {
        continue
      }

      if (structuralTags.has(tagName)) {
        continue
      }

      const childNodes = element.childNodes
      const childCount = childNodes.length
      let hasContent = false

      for (let j = 0; j < childCount; j++) {
        const child = childNodes[j]

        if (isElement(child)) {
          hasContent = true
          break
        }

        if (isText(child) && child.data.trim().length > 0) {
          hasContent = true
          break
        }
      }

      if (hasContent) {
        continue
      }

      if (childCount === 0) {
        element.remove()
      } else if (isBlockElement(element)) {
        element.remove()
      } else {
        const whitespace = element.textContent ?? ''
        element.replaceWith(whitespace === '' ? ' ' : whitespace)
      }
    }
  }
}
