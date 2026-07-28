import { anyWordMatchesAnyOf, includesAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, walkElements } from '../../utils/dom.js'
// Hand-maintained: add an entry only where the shortcode has an unambiguous counterpart. An
// unmapped one is not a gap — it falls back to the text the author typed.
import vocabularies from './unwrapEmojiImages.json' with { type: 'json' }

// Every character must belong to an emoji sequence and at least one must be a picture. A
// looser "non-ASCII, no ASCII letter" test would take any non-Latin script, injecting a
// localized board's alt as though it were a glyph. Tag characters spell out subdivision flags.
const emojiSequenceRegex =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[\u200d\ufe0f\u20e3#*0-9\s]|[\u{e0020}-\u{e007f}])+$/u
const emojiPictureRegex = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\ufe0f?\u20e3/u

const isEmojiShapedAlt = (alt: string): boolean => {
  return emojiSequenceRegex.test(alt) && emojiPictureRegex.test(alt)
}

const shortcodes: Record<string, string> = vocabularies.shortcodes
const names: Record<string, string> = vocabularies.names

// Engines that inherited the phpBB-era shortcode vocabulary.
const shortcodeClasses = [
  'wp-smiley', // WordPress.
  'smilies', // phpBB.
  'smilie', // XenForo, MyBB.
  'smiley', // SMF, DokuWiki, Dotclear, WoltLab.
  'bbc_emoticon', // Invision Power Board 3.
  'e-emoticon', // e107.
]
const shortcodeAttribute = 'data-emoticon' // IPS / Invision.

// XenForo 1.x numbers its classes (`mceSmilieSprite mceSmilie7`), so this needs a prefix test
// rather than a whole-token one. Those sprites sit on a transparent `clear.png` rather than a
// data URI, so the spacer check never sees them and they render as blank boxes today.
const shortcodeClassPrefix = 'mcesmilie'

// The parent of the smilie directory is the theme name and varies per board
// (`/styles/xenforo/smilies/`, `/dc2themes/mrvb6_sobre/smilies/`), so the directory alone is
// the stable part. Matching it is deliberately loose: a banner sitting in a smilies folder is
// caught here but resolves to nothing, so it keeps its image.
const shortcodePathSegments = [
  '/smilies/', // phpBB, XenForo, MyBB, FluxBB, vBulletin, WoltLab.
  '/smileys/', // Drupal, DokuWiki, SMF.
  '/emoticons/', // Serendipity, IPS, TinyMCE.
  '/smiley/', // CKEditor and FCKeditor, ProBoards.
  '/style_emoticons/', // Invision Power Board 2 and 3, which the plural form misses.
  '/emotes/', // e107.
  '/resources/emoji/', // Vanilla, whose only class is the generic `emoji`.
  'forum-smileys/', // Simple:Press, which has no leading slash before the directory.
]

// Read for a glyph alt only, never for a shortcode: platforms using this class each have a
// namespace of their own (Discourse's `:slight_smile:`), so the shared table must not be
// reached through it.
const genericEmojiClasses = [
  'emoji', // Discourse, Vanilla, NodeBB, newer WordPress.
]

// Elements wrapping a standard emoji as the fallback for clients that cannot fetch a custom
// one. A reader is always such a client, and a sanitizer that drops unknown elements takes the
// fallback with it.
const customEmojiTags = new Set([
  'tg-emoji', // Telegram.
])

// `default_` marks a stock file, `face-` the Tango set, `smiley-` TinyMCE's, `sf-`
// Simple:Press's, and `@2x` a resolution variant; none is part of the name.
const namePrefixRegex = /^(?:default_|face-|smiley-|sf-)/
const nameVariantRegex = /@[0-9]+x$/

// A short `data:` URI paints nothing in a reader: it is the 1x1 GIF a CSS sprite sheet sits
// behind, and no site CSS is loaded. The bound keeps real inlined PNGs out of this case.
const maxSpriteDataUrlLength = 256

const rendersNothing = (src: string): boolean => {
  return src.startsWith('data:') && src.length <= maxSpriteDataUrlLength
}

// Outside these, a name is hexadecimal by coincidence — `1920.png` is a width, not U+1920.
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

// Older-range symbols default to text presentation, so a lone one is pinned: U+2764 -> ❤️.
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

// Emoji CDNs name each file after the codepoints it depicts, so a shortcode alt still
// resolves exactly. Host-list only: forum sets ship `21.gif`, which would decode to `!`.
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

    // These names omit the selector, so `0031-20e3` alone rebuilds `1⃣` instead of `1️⃣`.
    if (codePoint === keycapCodePoint && codePoints.at(-1) !== variationSelectorCodePoint) {
      codePoints.push(variationSelectorCodePoint)
    }

    codePoints.push(codePoint)
  }

  if (codePoints.length === 1 && isInAnyRange(codePoints[0], textPresentationRanges)) {
    codePoints.push(variationSelectorCodePoint)
  }

  const glyph = String.fromCodePoint(...codePoints)

  // The ranges admit characters that are only emoji in company — `30.png` is a bare `0`,
  // `2000.png` an invisible EN QUAD. The alt's own bar rejects both, with no second list.
  return isEmojiShapedAlt(glyph) ? glyph : undefined
}

// Shortcode first, then the filename — the filename is what survives an empty alt.
const glyphFromVocabularies = (token: string | undefined, src: string): string | undefined => {
  const byShortcode = token ? shortcodes[token.toLowerCase()] : undefined

  if (byShortcode) {
    return byShortcode
  }

  // A `data:` URI names nothing: base64 may contain `/`, so a stem parsed from it is a slice
  // of the payload that can collide with a real name.
  if (src.startsWith('data:')) {
    return
  }

  const stem = getFileStem(src)
    .toLowerCase()
    .replace(namePrefixRegex, '')
    .replace(nameVariantRegex, '')

  return names[stem]
}

export const unwrapEmojiImages: DomTransform = (context) => {
  const hosts = context.emojiImageHosts

  return (document) => {
    walkElements(document, (element) => {
      if (customEmojiTags.has(element.localName)) {
        const fallback = element.textContent

        // An empty element is left alone: an empty text node says the same nothing, and
        // removing it would be a deletion this transform has no business making.
        if (fallback) {
          element.replaceWith(document.createTextNode(fallback))
        }

        return
      }

      if (element.localName !== 'img') {
        return
      }

      const source = element.getAttribute('src') ?? ''
      const alt = attr(element, 'alt')
      // `title` is never read: XenForo's is `Big grin    :D`, phpBB's the English `Smile`,
      // Khoros' localized — all prose where a glyph belongs.
      const shortname = attr(element, 'data-shortname')
      const isSprite = !!shortname && rendersNothing(source)
      const isHosted = source !== '' && includesAnyOf(source, hosts)
      const classes = element.getAttribute('class') ?? ''
      const speaksShortcodes =
        isSprite ||
        element.hasAttribute(shortcodeAttribute) ||
        anyWordMatchesAnyOf(classes, shortcodeClasses) ||
        classes.toLowerCase().includes(shortcodeClassPrefix) ||
        (source !== '' && includesAnyOf(source, shortcodePathSegments))

      if (!speaksShortcodes && !isHosted && !anyWordMatchesAnyOf(classes, genericEmojiClasses)) {
        return
      }

      // A glyph alt wins over every route, so overlapping matches resolve alike — and it is
      // the only route carrying the variation selector these filenames omit.
      const glyph = alt && isEmojiShapedAlt(alt) ? alt : undefined
      const mapped = speaksShortcodes ? glyphFromVocabularies(shortname ?? alt, source) : undefined
      const decoded = isHosted ? glyphFromFilename(source) : undefined

      // A sprite paints nothing, so an unmapped one still becomes the typed text. Every other
      // source renders, so leaving it alone beats degrading a working smilie into literal
      // text. An empty resolution counts as none: it would strand its wrapper for stripEmptyTags.
      const text = glyph ?? mapped ?? decoded ?? (isSprite ? shortname : undefined)

      if (text) {
        element.replaceWith(document.createTextNode(text))
      }
    })
  }
}
