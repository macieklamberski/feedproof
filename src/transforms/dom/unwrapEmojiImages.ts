import { anyWordMatchesAnyOf, includesAnyOf, isAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, walkElements } from '../../utils/dom.js'
import vocabularies from './unwrapEmojiImages.json' with { type: 'json' }

const emojiSequenceParts = [
  '\\p{Extended_Pictographic}', // The pictures themselves.
  '\\p{Emoji_Modifier}', // Skin tones.
  '\\p{Regional_Indicator}', // The pair of letters that makes a flag.
  '[\\u200d\\ufe0f\\u20e3#*0-9\\s]', // Joiner, variation selector, keycap mark and its bases.
  '[\\u{e0020}-\\u{e007f}]', // Tag characters, which spell out a subdivision flag.
]
const emojiSequenceRegex = new RegExp(`^(?:${emojiSequenceParts.join('|')})+$`, 'u')

const emojiPictureParts = [
  '\\p{Extended_Pictographic}', // The pictures themselves.
  '\\p{Regional_Indicator}', // The pair of letters that makes a flag.
  '[0-9#*]\\ufe0f?\\u20e3', // A keycap: base, optional selector, enclosing mark.
]
const emojiPictureRegex = new RegExp(emojiPictureParts.join('|'), 'u')

const isEmojiShapedAlt = (alt: string): boolean => {
  return emojiSequenceRegex.test(alt) && emojiPictureRegex.test(alt)
}

const shortcodes: Record<string, string> = vocabularies.shortcodes
const names: Record<string, string> = vocabularies.names

const shortcodeClasses = [
  'wp-smiley', // WordPress.
  'smilies', // phpBB.
  'smilie', // XenForo, MyBB.
  'smiley', // SMF, DokuWiki, Dotclear, WoltLab.
  'bbc_emoticon', // Invision Power Board 3.
  'e-emoticon', // e107.
  /^mcesmilie/, // XenForo 1.x, which numbers them (`mceSmilieSprite mceSmilie7`).
]

const shortcodeAttributes = [
  'data-emoticon', // IPS / Invision.
]

const shortcodePathSegments = [
  '/smilies/', // phpBB, XenForo, MyBB, FluxBB, vBulletin, WoltLab.
  '/smileys/', // Drupal, DokuWiki, SMF.
  '/emoticons/', // Serendipity, IPS, TinyMCE.
  '/smiley/', // CKEditor and FCKeditor, ProBoards.
  '/style_emoticons/', // Invision Power Board 2 and 3, which the plural form misses.
  '/emotes/', // e107.
  '/resources/emoji/', // Vanilla, whose only class is the generic `emoji`.
  '/mailer/emoji/', // ArtStation, same generic class and a stock name in the filename.
  'forum-smileys/', // Simple:Press, which has no leading slash before the directory.
]

// Read for a glyph alt only, never a shortcode: platforms using this class have namespaces of
// their own (Discourse's `:slight_smile:`), so the shared table must not be reached through it.
const genericEmojiClasses = [
  'emoji', // Discourse, Vanilla, NodeBB, newer WordPress.
]

// Sets with no Unicode equivalent at all, recognized so they can be marked rather than
// converted. Nothing here ever resolves to a glyph.
const customEmojiClasses = [
  'emojione', // Mastodon.
  'custom-emoji', // Mastodon, newer.
]
const customEmojiPathSegments = [
  '/custom_emojis/', // Mastodon.
  'sinaimg.cn/m/emoticon/', // Weibo.
]

// Left on an emoji image that keeps its picture, so the reader can size it like text and keep
// it out of thumbnail selection. Presence is the whole signal.
const emojiImageAttribute = 'data-emoji'

// Wrappers holding a standard emoji as the fallback. A reader cannot fetch the custom asset,
// and a sanitizer dropping unknown elements would take the fallback with it.
const customEmojiTags = [
  'tg-emoji', // Telegram.
]
// Applied to a filename in turn: the query and hash split, then the stock-file, icon-set and
// resolution markers that are not part of the name.
const queryOrHashRegex = /[?#]/
const namePrefixRegex = /^(?:default_|face-|smiley-|sf-)/
const nameVariantRegex = /@[0-9]+x$/

// A short `data:` URI renders nothing in a reader: it is the 1x1 GIF a CSS sprite sheet sits
// behind, and no site CSS is loaded. The bound keeps real inlined PNGs out of this case.
const rendersNothing = (src: string): boolean => {
  return src.startsWith('data:') && src.length <= 256
}

const getFileStem = (src: string): string => {
  const path = src.split(queryOrHashRegex)[0]
  const name = path.slice(path.lastIndexOf('/') + 1)
  const extension = name.lastIndexOf('.')

  return extension === -1 ? name : name.slice(0, extension)
}

// The filename is the second key because it is what survives an empty alt.
const glyphFromVocabularies = (token: string | undefined, src: string): string | undefined => {
  const byShortcode = token ? shortcodes[token.toLowerCase()] : undefined

  if (byShortcode) {
    return byShortcode
  }

  // A `data:` URI has no filename. Base64 may contain `/`, so a stem taken from one is a slice
  // of the payload, which can match a real name by accident.
  if (src.startsWith('data:')) {
    return
  }

  const stem = getFileStem(src)
    .toLowerCase()
    .replace(namePrefixRegex, '')
    .replace(nameVariantRegex, '')

  return names[stem]
}

// `title` is deliberately absent: XenForo's is `Big grin    :D`, phpBB's the English `Smile`,
// Khoros' localized. All three are prose where a glyph belongs.
type EmojiImage = {
  source: string
  alt: string | undefined
  shortname: string | undefined
  isSprite: boolean
  isHosted: boolean
  hasKnownVocabulary: boolean
  // Evidence that does not come from a directory name. A smilie directory is matched loosely
  // on purpose, so a banner sitting in one must not be marked when it fails to resolve.
  isNamedEmoji: boolean
}

const readEmojiImage = (element: Element, hosts: Array<string>): EmojiImage | undefined => {
  const source = element.getAttribute('src') ?? ''
  const classes = element.getAttribute('class') ?? ''
  const shortname = attr(element, 'data-shortname')
  const isSprite = !!shortname && rendersNothing(source)
  const isHosted = includesAnyOf(source, hosts)
  const hasKnownVocabulary =
    isSprite ||
    shortcodeAttributes.some((attribute) => element.hasAttribute(attribute)) ||
    anyWordMatchesAnyOf(classes, shortcodeClasses) ||
    includesAnyOf(source, shortcodePathSegments)

  const isGenericEmoji = anyWordMatchesAnyOf(classes, genericEmojiClasses)
  const isCustomSet =
    anyWordMatchesAnyOf(classes, customEmojiClasses) ||
    includesAnyOf(source, customEmojiPathSegments)

  if (!hasKnownVocabulary && !isHosted && !isGenericEmoji && !isCustomSet) {
    return
  }

  return {
    source,
    alt: attr(element, 'alt'),
    shortname,
    isSprite,
    isHosted,
    hasKnownVocabulary,
    isNamedEmoji:
      isSprite ||
      isHosted ||
      isGenericEmoji ||
      isCustomSet ||
      element.hasAttribute(shortcodeAttributes[0]) ||
      anyWordMatchesAnyOf(classes, shortcodeClasses),
  }
}

const resolveGlyph = (image: EmojiImage): string | undefined => {
  const { alt, shortname, source } = image

  // The alt is preferred over the tables, so an image matched by two rules resolves the same
  // either way.
  const glyph = alt && isEmojiShapedAlt(alt) ? alt : undefined
  const mapped = image.hasKnownVocabulary
    ? glyphFromVocabularies(shortname ?? alt, source)
    : undefined

  // A sprite renders nothing, so an unmapped one still becomes the text the author typed. Every
  // other image renders, and turning a working smilie into literal text is worse. A CDN image
  // with no usable alt therefore keeps its picture: decoding the codepoints these CDNs name
  // files after would close that, but it was the only route for 0.36% of 18,225 sampled images.
  return glyph ?? mapped ?? (image.isSprite ? shortname : undefined)
}

export const unwrapEmojiImages: DomTransform = (context) => {
  return (document) => {
    walkElements(document, (element) => {
      if (isAnyOf(element.localName, customEmojiTags)) {
        // Removing an empty one would be a deletion this transform has no business making.
        if (element.textContent) {
          element.replaceWith(element.textContent)
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
      const text = resolveGlyph(image)

      if (text) {
        element.replaceWith(text)
      } else if (image.isNamedEmoji) {
        element.setAttribute(emojiImageAttribute, '')
      }
    })
  }
}
