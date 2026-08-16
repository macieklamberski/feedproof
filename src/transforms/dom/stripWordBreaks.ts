import type { DomTransform } from '../../types.js'

// A <wbr> is a word-break opportunity: invisible, contentless, and it fragments the text node
// it sits in. A bare URL split by one: email clients emit `youtu.be/<wbr>{id}` for long links
//: leaves linkifyUrls seeing only the part before the <wbr>, so it linkifies a dead stub
// (`youtu.be/`) and drops the rest to plain text. Remove every <wbr> and merge the surrounding
// text so the URL is whole again. The reader controls its own wrapping, so the hint is moot.
export const stripWordBreaks: DomTransform = () => {
  return (document) => {
    for (const wbr of Array.from(document.getElementsByTagName('wbr'))) {
      const parent = wbr.parentElement

      wbr.remove()
      parent?.normalize()
    }
  }
}
