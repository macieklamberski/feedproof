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

// Codepoint ranges an emoji filename may encode. A name outside them is hexadecimal by
// coincidence rather than intent — `1920.png` is a width, not U+1920 — so the decode is
// abandoned rather than producing a stray Limbu letter.
const emojiCodePointRanges: Array<[number, number]> = [
  [0x23, 0x23], // Number sign, a keycap base.
  [0x2a, 0x2a], // Asterisk, a keycap base.
  [0x30, 0x39], // Digits, the remaining keycap bases.
  [0xa9, 0xa9], // Copyright.
  [0xae, 0xae], // Registered.
  [0x2000, 0x33ff], // Arrows, dingbats, enclosed characters, and the joiner.
  [0xfe0f, 0xfe0f], // Variation selector-16.
  [0xe0020, 0xe007f], // Tag characters, which spell out a subdivision flag.
  [0x1f000, 0x1faff], // The emoji planes proper, skin-tone modifiers and flags included.
]

// Symbols in the older ranges default to text presentation in many fonts, so a lone one is
// pinned to its emoji form: U+2764 renders as ❤️ rather than ❤.
const textPresentationRanges: Array<[number, number]> = [
  [0xa9, 0xa9],
  [0xae, 0xae],
  [0x2000, 0x33ff],
]

const keycapCodePoint = 0x20e3
const variationSelectorCodePoint = 0xfe0f
const maxCodePointSegments = 8
const hexSegmentRegex = /^[0-9a-f]{2,6}$/i
const queryOrHashRegex = /[?#]/

const isInAnyRange = (codePoint: number, ranges: Array<[number, number]>): boolean => {
  return ranges.some(([start, end]) => codePoint >= start && codePoint <= end)
}

const getFileStem = (src: string): string => {
  const path = src.split(queryOrHashRegex)[0] ?? ''
  const name = path.slice(path.lastIndexOf('/') + 1)
  const extension = name.lastIndexOf('.')

  return extension === -1 ? name : name.slice(0, extension)
}

// Emoji CDNs name each file after the codepoints it depicts (`1f642.png`,
// `1f926-1f3fb-2640.png`), so an image whose alt is a shortcode still resolves exactly. Only
// attempted for host-list matches: forum smilie sets ship files called `21.gif`, which would
// decode to an exclamation mark.
const glyphFromFilename = (src: string): string | undefined => {
  const segments = getFileStem(src).split('-')

  if (segments.length > maxCodePointSegments) {
    return
  }

  const codePoints: Array<number> = []

  for (const segment of segments) {
    if (!hexSegmentRegex.test(segment)) {
      return
    }

    const codePoint = Number.parseInt(segment, 16)

    if (!isInAnyRange(codePoint, emojiCodePointRanges)) {
      return
    }

    // The selector is omitted from these filenames, so `0031-20e3` alone would rebuild the
    // text-style keycap `1⃣` instead of `1️⃣`.
    if (codePoint === keycapCodePoint && codePoints.at(-1) !== variationSelectorCodePoint) {
      codePoints.push(variationSelectorCodePoint)
    }

    codePoints.push(codePoint)
  }

  if (codePoints.length === 1 && isInAnyRange(codePoints[0], textPresentationRanges)) {
    codePoints.push(variationSelectorCodePoint)
  }

  const glyph = String.fromCodePoint(...codePoints)

  // The ranges above admit characters that are only emoji in company: `30.png` would decode
  // to a bare `0` and `2000.png` to an invisible EN QUAD. Holding the result to the same bar
  // an alt has to clear rejects both without a second list to keep in step.
  return isEmojiShapedAlt(glyph) ? glyph : undefined
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
      const isHosted = source !== '' && includesAnyOf(source, hosts)

      if (
        !isSprite &&
        !isHosted &&
        !anyWordMatchesAnyOf(element.getAttribute('class') ?? '', emojiClasses)
      ) {
        return
      }

      // An alt that is already the glyph wins over every other route, so an image matched by
      // two rules resolves the same way regardless of which matched first. It is also the only
      // route that carries the variation selector, which these filenames omit.
      const glyph = alt && isEmojiShapedAlt(alt) ? alt : undefined
      const mapped = isSprite ? shortcodes[shortname.toLowerCase()] : undefined
      const decoded = isHosted ? glyphFromFilename(source) : undefined

      // A sprite paints nothing, so an unmapped one still becomes the text the author typed —
      // any text beats an invisible image. Every other source serves a real image that
      // renders, so leaving it alone beats degrading a working custom smilie into literal
      // text. An empty resolution counts as no resolution: it would strand an empty <a> or
      // <figure> for stripEmptyTags to delete.
      const text = glyph ?? mapped ?? decoded ?? (isSprite ? shortname : undefined)

      if (text) {
        element.replaceWith(document.createTextNode(text))
      }
    })
  }
}
