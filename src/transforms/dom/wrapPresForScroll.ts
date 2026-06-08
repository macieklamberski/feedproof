import type { DomTransform } from '../../types.js'

// Wraps every <pre> in a <div data-pre> so downstream styling has a stable hook
// to make wide preformatted blocks (code listings, ASCII tables) scroll
// horizontally instead of stretching the layout. Idempotent via the
// existing-wrapper check.
export const wrapPresForScroll: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      const parent = pre.parentNode

      if (!parent) {
        continue
      }

      if (pre.parentElement?.hasAttribute('data-pre')) {
        continue
      }

      const wrapper = document.createElement('div')
      wrapper.setAttribute('data-pre', '')
      parent.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)
    }
  }
}
