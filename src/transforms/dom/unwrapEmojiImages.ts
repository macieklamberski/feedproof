import { anyWordMatchesAnyOf, includesAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, walkElements } from '../../utils/dom.js'
// Shortcode -> glyph tables for the smilie vocabularies feedsweep recognizes. Kept in a
// sibling file because they are data, not logic, and are hand-maintained: add an entry only
// when the shortcode has an unambiguous Unicode counterpart. An unmapped shortcode is not a
// gap to fill — it falls back to the text the author typed.
import vocabularies from './unwrapEmojiImages.json' with { type: 'json' }

const nonAsciiRegex = /[-￿]/
const asciiLetterRegex = /[a-zA-Z]/

const isEmojiShapedAlt = (alt: string): boolean => {
  return nonAsciiRegex.test(alt) && !asciiLetterRegex.test(alt)
}

const shortcodes: Record<string, string> = vocabularies.shortcodes

const emojiClasses = ['wp-smiley', 'emoji']

// An image whose `src` is a short `data:` URI paints nothing in a reader: it is the 1x1
// transparent GIF a CSS sprite sheet sits behind, and a reader loads no site CSS. XenForo
// serves its default smilies this way. The length bound keeps a genuinely inlined emoji PNG
// (always well over 1 KB of base64) out of this case.
const maxSpriteDataUrlLength = 256

const rendersNothing = (src: string): boolean => {
  return src.startsWith('data:') && src.length <= maxSpriteDataUrlLength
}

export const unwrapEmojiImages: DomTransform = (context) => {
  const hosts = context.emojiImageHosts

  return (document) => {
    walkElements(document, (element) => {
      if (element.localName !== 'img') {
        return
      }

      const source = element.getAttribute('src') ?? ''
      const alt = attr(element, 'alt')
      // XenForo names the smilie in its own attribute. `title` is never read: XenForo's is
      // `Big grin    :D`, phpBB's is the English name `Smile`, and Khoros' is localized, so
      // all three would put prose where a glyph belongs.
      const shortname = attr(element, 'data-shortname')
      const isSprite = !!shortname && rendersNothing(source)

      if (
        !isSprite &&
        !anyWordMatchesAnyOf(element.getAttribute('class') ?? '', emojiClasses) &&
        !(source !== '' && includesAnyOf(source, hosts))
      ) {
        return
      }

      // An alt that is already the glyph wins over every other route, so an image matched by
      // two rules resolves the same way regardless of which matched first.
      const glyph = alt && isEmojiShapedAlt(alt) ? alt : undefined
      const mapped = isSprite ? shortcodes[shortname.toLowerCase()] : undefined

      // A sprite paints nothing, so an unmapped one still becomes the text the author typed —
      // any text beats an invisible image. Every other source serves a real image that
      // renders, so leaving it alone beats degrading a working custom smilie into literal
      // text. An empty resolution counts as no resolution: it would strand an empty <a> or
      // <figure> for stripEmptyTags to delete.
      const text = glyph ?? mapped ?? (isSprite ? shortname : undefined)

      if (text) {
        element.replaceWith(document.createTextNode(text))
      }
    })
  }
}
