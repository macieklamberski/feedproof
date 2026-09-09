import { anyWordMatchesAnyOf, includesAnyOf, isAnyOf, toMap } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, walkElements } from '../../utils/dom.js'
import vocabularies from './unwrapEmojiImages.json' with { type: 'json' }
import { type EmojiPlatform, emojiPlatforms } from './unwrapEmojiImages.platforms.js'

// The title attribute is prose on every platform, never a glyph, so it is not read.
// XenForo's is `Big grin    :D`, phpBB's the English `Smile`, Khoros' localized.
type EmojiImage = {
  src: string
  alt: string | undefined
  shortname: string | undefined
  hasKnownVocabulary: boolean
  isNamedEmoji: boolean
}

const emojiSequenceParts = [
  '\\p{Extended_Pictographic}', // The pictures themselves
  '\\p{Emoji_Modifier}', // Skin tones
  '\\p{Regional_Indicator}', // The pair of letters that makes a flag
  '[\\u200d\\ufe0f\\u20e3#*0-9\\s]', // Joiner, variation selector, keycap mark and its bases
  '[\\u{e0020}-\\u{e007f}]', // Tag characters, which spell out a subdivision flag
]
const emojiSequenceRegex = new RegExp(`^(?:${emojiSequenceParts.join('|')})+$`, 'u')

const emojiPictureParts = [
  '\\p{Extended_Pictographic}', // The pictures themselves
  '\\p{Regional_Indicator}', // The pair of letters that makes a flag
  '[0-9#*]\\ufe0f?\\u20e3', // A keycap: base, optional selector, enclosing mark
]
const emojiPictureRegex = new RegExp(emojiPictureParts.join('|'), 'u')

const isEmojiShaped = (text: string): boolean => {
  return emojiSequenceRegex.test(text) && emojiPictureRegex.test(text)
}

const shortcodes = toMap(vocabularies.shortcodes)

// One name table across every platform, refusing a filename two engines draw differently, since
// nothing in the markup says which engine produced a given image.
export const mergeEmojiNames = (platforms: Array<EmojiPlatform>): Record<string, string> => {
  const merged: Record<string, string> = {}

  for (const platform of platforms) {
    for (const [name, glyph] of Object.entries(platform.names ?? {})) {
      if (merged[name] && merged[name] !== glyph) {
        throw new Error(
          `Emoji name "${name}" is ${merged[name]} and ${glyph} on different platforms`,
        )
      }

      merged[name] = glyph
    }
  }

  return merged
}

const names = toMap(mergeEmojiNames(emojiPlatforms))

// Platforms sharing a marker list it each, so the derived lookups dedup. A `Set` leaves every
// regex in place, since each literal is a distinct object, which is what we want.
const shortcodeClasses = [...new Set(emojiPlatforms.flatMap((platform) => platform.classes ?? []))]
const shortcodeAttributes = [
  ...new Set(emojiPlatforms.flatMap((platform) => platform.attributes ?? [])),
]
const shortcodePathSegments = [
  ...new Set(emojiPlatforms.flatMap((platform) => platform.paths ?? [])),
]

// Folding this into shortcodeClasses would send Discourse's own shortcode namespace to the table.
const genericEmojiClasses = [
  'emoji', // Discourse, Vanilla, NodeBB, newer WordPress
]

// Sets with no Unicode equivalent at all, recognized so they can be marked, not converted.
// Nothing here ever resolves to a glyph.
const customEmojiClasses = [
  'emojione', // Mastodon
  'custom-emoji', // Mastodon, newer
]
const customEmojiPathSegments = [
  '/custom_emojis/', // Mastodon
  'sinaimg.cn/m/emoticon/', // Weibo
  'stat100.ameba.jp/blog/ucs/img/char/', // Ameba's built-in set, also served from c.stat100
  'emoji.ameba.jp/img/', // Ameba emoji uploaded by the blog's author
]

// Left on an emoji image that keeps its picture, so the reader can size it like text and keep
// it out of thumbnail selection. Presence is the whole signal.
export const emojiImageAttribute = 'data-emoji'

// Wrappers holding a standard emoji as the fallback. A reader cannot fetch the custom asset,
// and a sanitizer dropping unknown elements would take the fallback with it.
const customEmojiTags = [
  'tg-emoji', // Telegram
]

// Applied to a filename in turn: the query and hash split, then the stock-file, icon-set and
// resolution markers that are not part of the name.
const queryOrHashRegex = /[?#]/
const namePrefixRegex = /^(?:default_|face-|smiley-|sf-)/
const nameVariantRegex = /@[0-9]+x$/

// A 1x1 sprite GIF data URI is under 256 bytes, and a real inlined PNG is not.
const rendersNothing = (src: string): boolean => {
  return src.startsWith('data:') && src.length <= 256
}

const getFileStem = (src: string): string => {
  const path = src.split(queryOrHashRegex)[0]
  const name = path.slice(path.lastIndexOf('/') + 1)
  const extension = name.lastIndexOf('.')

  return extension === -1 ? name : name.slice(0, extension)
}

// Five hex digits tops out at 0xFFFFF, so fromCodePoint never sees a value that throws.
// WoltLab names its whole default set by codepoint.
const codepointNameRegex = /^[0-9a-f]{4,5}(?:[-_][0-9a-f]{4,5})*$/
const codepointSeparatorRegex = /[-_]/

const glyphFromCodepoints = (stem: string): string | undefined => {
  if (!codepointNameRegex.test(stem)) {
    return
  }

  const codepoints = stem.split(codepointSeparatorRegex).map((part) => Number.parseInt(part, 16))
  const glyph = String.fromCodePoint(...codepoints)

  // A hex-shaped stem like `2000` or `dead` decodes to a space or a lone surrogate.
  return isEmojiShaped(glyph) ? glyph : undefined
}

// The filename is the second key because it is what survives an empty alt.
const glyphFromVocabularies = (token: string | undefined, src: string): string | undefined => {
  const byShortcode = token ? shortcodes.get(token.toLowerCase()) : undefined

  if (byShortcode) {
    return byShortcode
  }

  // Base64 can contain `/`, so a stem taken from a data URI can match a real name by accident.
  if (src.startsWith('data:')) {
    return
  }

  const stem = getFileStem(src)
    .toLowerCase()
    .replace(namePrefixRegex, '')
    .replace(nameVariantRegex, '')

  return names.get(stem) ?? glyphFromCodepoints(stem)
}

const readEmojiImage = (element: Element, hosts: Array<string>): EmojiImage | undefined => {
  const src = element.getAttribute('src') ?? ''
  const classes = element.getAttribute('class') ?? ''
  const shortname = attr(element, 'data-shortname')
  const isSprite = !!shortname && rendersNothing(src)
  const isHosted = includesAnyOf(src, hosts)
  const hasKnownVocabulary =
    isSprite ||
    shortcodeAttributes.some((attribute) => element.hasAttribute(attribute)) ||
    anyWordMatchesAnyOf(classes, shortcodeClasses) ||
    includesAnyOf(src, shortcodePathSegments)

  const isGenericEmoji = anyWordMatchesAnyOf(classes, genericEmojiClasses)
  const isCustomSet =
    anyWordMatchesAnyOf(classes, customEmojiClasses) || includesAnyOf(src, customEmojiPathSegments)

  if (!hasKnownVocabulary && !isHosted && !isGenericEmoji && !isCustomSet) {
    return
  }

  return {
    src,
    alt: attr(element, 'alt'),
    shortname,
    hasKnownVocabulary,
    isNamedEmoji:
      isSprite ||
      isHosted ||
      isGenericEmoji ||
      isCustomSet ||
      shortcodeAttributes.some((attribute) => element.hasAttribute(attribute)) ||
      anyWordMatchesAnyOf(classes, shortcodeClasses),
  }
}

const resolveGlyph = (image: EmojiImage): string | undefined => {
  const { alt, shortname, src } = image

  // The alt is preferred over the tables, so an image matched by two rules resolves the same
  // either way.
  const glyph = alt && isEmojiShaped(alt) ? alt : undefined
  const mapped = image.hasKnownVocabulary ? glyphFromVocabularies(shortname ?? alt, src) : undefined

  return glyph ?? mapped
}

const resolveFallbackText = (image: EmojiImage): string | undefined => {
  return rendersNothing(image.src) ? (image.shortname ?? image.alt) : undefined
}

const wrapFallbackText = (document: Document, text: string): Element => {
  const span = document.createElement('span')

  span.setAttribute(emojiImageAttribute, '')
  span.textContent = text

  return span
}

// Forum smilie images and CSS-sprite emoji, which render oversized or as nothing without site CSS.
export const unwrapEmojiImages: DomTransform = (context) => {
  return (document) => {
    walkElements(document, (element) => {
      if (isAnyOf(element.localName, customEmojiTags)) {
        const fallback = element.textContent

        // Removing an empty one would be a deletion this transform has no business making.
        if (fallback) {
          const replacement = isEmojiShaped(fallback)
            ? fallback
            : wrapFallbackText(document, fallback)

          element.replaceWith(replacement)
        }

        return
      }

      if (element.localName !== 'img') {
        return
      }

      const image = readEmojiImage(element, context.emojiImageHosts)

      if (!image) {
        return
      }

      // An empty result would leave the wrapping element for stripEmptyTags to delete.
      const glyph = resolveGlyph(image)

      if (glyph) {
        element.replaceWith(glyph)
        return
      }

      const fallbackText = resolveFallbackText(image)

      if (fallbackText) {
        element.replaceWith(wrapFallbackText(document, fallbackText))
        return
      }

      if (image.isNamedEmoji) {
        element.setAttribute(emojiImageAttribute, '')
      }
    })
  }
}
