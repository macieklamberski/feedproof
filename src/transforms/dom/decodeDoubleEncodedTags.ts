import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, isText, NodeFilter } from '../../utils/dom.js'
import { isEscapedHtmlFragment } from '../../utils/html.js'

// Real elements whose entity-escaped contents are intentional text (a tutorial showing
// `<img>`), so their descendants are left untouched.
const opaqueTags = new Set(['code', 'pre', 'script', 'style', 'textarea', 'noscript'])

// HTML a feed generator entity-escaped twice, so its tags ship as visible text.
export const decodeDoubleEncodedTags: DomTransform = () => {
  return (document) => {
    document.body.normalize()

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let tempDiv: HTMLDivElement | null = null

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (!isText(node) || !node.data.includes('<')) {
        continue
      }

      if (hasAncestorWithTagName(node, opaqueTags)) {
        continue
      }

      if (!isEscapedHtmlFragment(node.data)) {
        continue
      }

      if (tempDiv === null) {
        tempDiv = document.createElement('div')
      }

      tempDiv.innerHTML = node.data

      // An escaped <pre> or <code> is a code sample, so the tags inside it are meant as text.
      for (const element of tempDiv.querySelectorAll('code')) {
        element.textContent = element.innerHTML
      }

      for (const element of tempDiv.querySelectorAll('pre')) {
        if (!element.querySelector('code')) {
          element.textContent = element.innerHTML
        }
      }

      node.replaceWith(...tempDiv.childNodes)
    }
  }
}
