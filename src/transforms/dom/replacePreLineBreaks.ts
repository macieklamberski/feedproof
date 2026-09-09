import type { DomTransform } from '../../types.js'

// A <br> inside <pre> doubles the line break the preserved whitespace already renders.
export const replacePreLineBreaks: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    // Rewriting innerHTML instead mangles the entities in a <pre><code> sample.
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
