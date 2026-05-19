import { Node, unwrapOuterTag } from '../../common.js'
import type { DomTransform } from '../../types.js'

const figureWrapperRegex = /^<(p|div|span)(\s[^>]*)?>[\s\n]*([\s\S]*)[\s\n]*<\/\1>$/i

const mediaContentRegex = /<(img|picture|video|audio)[\s>]/i

const isMediaOnly = (html: string): boolean => {
  const stripped = html.replace(/<\/?(img|picture|video|audio|source)(\s[^>]*)?>/gi, '').trim()

  return stripped === '' && mediaContentRegex.test(html)
}

export const simplifyFigures: DomTransform = () => {
  return (document) => {
    const figures = document.querySelectorAll('figure')

    for (const figure of figures) {
      // Unwrap p, div, span wrappers around media elements.
      for (const child of [...figure.children]) {
        if (child.tagName.toLowerCase() === 'figcaption') {
          continue
        }

        const unwrapped = unwrapOuterTag(child.outerHTML, figureWrapperRegex)

        if (unwrapped !== child.outerHTML && isMediaOnly(unwrapped)) {
          child.outerHTML = unwrapped
        }
      }

      // Unwrap sole div wrappers inside figcaption.
      const captions = figure.querySelectorAll('figcaption')

      for (const caption of captions) {
        const elements = [...caption.children]

        if (elements.length !== 1 || elements[0].tagName.toLowerCase() !== 'div') {
          continue
        }

        const hasText = [...caption.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
        )

        if (!hasText) {
          // Move the wrapper div's children inline before the div, then
          // remove the div. This preserves any whitespace text nodes around
          // the div (e.g. `<figcaption><div>x</div> </figcaption>`'s trailing
          // space) which previously contributed a textContent boundary;
          // `caption.innerHTML = …` would overwrite them.
          const div = elements[0]
          while (div.firstChild) {
            caption.insertBefore(div.firstChild, div)
          }
          div.remove()
        }
      }
    }
  }
}
