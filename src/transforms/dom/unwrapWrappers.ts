import { Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

const wrapperTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

// Strips outermost `<div>` / `<article>` / `<section>` / `<main>` / `<header>`
// / `<footer>` wrappers when the body has exactly one significant child of
// that kind. Loops so chains like `<div><article><div>…</div></article></div>`
// collapse fully.
//
// DOM-based so attribute values with embedded `>` characters (Substack's
// `data-attrs` JSON, Tailwind `[&:has(...)>*]` selectors, escaped HTML in
// Divi `data-et-mu`) don't confuse a regex into mis-locating the tag close
// and dropping the body content.
export const unwrapWrappers: DomTransform = () => {
  return (document) => {
    let changed = true

    while (changed) {
      changed = false

      const significant = [...document.body.childNodes].filter((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return true
        }
        if (node.nodeType === Node.TEXT_NODE) {
          return (node as Text).data.trim().length > 0
        }
        return false
      })

      if (significant.length !== 1) {
        break
      }

      const wrapper = significant[0]

      if (wrapper.nodeType !== Node.ELEMENT_NODE) {
        break
      }

      if (!wrapperTags.has((wrapper as Element).tagName.toLowerCase())) {
        break
      }

      while (wrapper.firstChild) {
        document.body.insertBefore(wrapper.firstChild, wrapper)
      }

      ;(wrapper as Element).remove()
      changed = true
    }
  }
}
