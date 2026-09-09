import type { DomTransform } from '../../types.js'

// A <wbr> inside a bare url, which splits the text node so linkification sees only a dead stub.
// Email clients emit `youtu.be/<wbr>{id}` for long links.
export const stripWordBreaks: DomTransform = () => {
  return (document) => {
    for (const wbr of Array.from(document.getElementsByTagName('wbr'))) {
      const parent = wbr.parentElement

      wbr.remove()
      parent?.normalize()
    }
  }
}
