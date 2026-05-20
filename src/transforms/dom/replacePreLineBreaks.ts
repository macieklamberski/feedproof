import type { DomTransform } from '../../types.js'

// Inside <pre>, whitespace is preserved so <br> is redundant. Walks the DOM
// (not innerHTML) so raw-text entities in <pre><code> samples aren't mangled.
export const replacePreLineBreaks: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      for (const br of pre.querySelectorAll('br')) {
        const parent = br.parentNode

        if (parent) {
          parent.replaceChild(document.createTextNode('\n'), br)
        }
      }
    }
  }
}
