import type { DomTransform } from '../../types.js'
import { walkElements } from '../../utils/dom.js'

// Telegram wraps a premium custom emoji in `<tg-emoji emoji-id="…">`, putting the standard
// emoji inside as the fallback for clients that cannot fetch the custom asset. A reader is
// always such a client — the id names a Telegram asset it can never resolve — so the element
// carries nothing the fallback does not, and a sanitizer that drops unknown elements takes
// the glyph down with it. Replacing it with the glyph removes that risk.
const customEmojiTags = new Set(['tg-emoji'])

export const unwrapCustomEmojiElements: DomTransform = () => {
  return (document) => {
    walkElements(document, (element) => {
      if (!customEmojiTags.has(element.localName)) {
        return
      }

      const text = element.textContent

      // An empty element is left alone: replacing it with an empty text node would say the
      // same nothing, and removing it would be a deletion this transform has no business
      // making.
      if (text) {
        element.replaceWith(document.createTextNode(text))
      }
    })
  }
}
