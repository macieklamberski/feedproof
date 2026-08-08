import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, NodeFilter } from '../../utils/dom.js'

// Windows-1252 maps bytes 0x80-0x9F to specific Unicode codepoints, not the C1
// controls of Latin-1. Recovering UTF-8 misread as CP-1252 requires reversing
// that mapping back to source bytes before re-decoding as UTF-8.
const cp1252SpecialToByte = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
])

// Character class for the second/third byte of a mojibake sequence: the raw
// Latin-1 supplement (U+0080-U+00BF) plus the 27 Windows-1252 specials that
// bytes 0x80-0x9F render as in a CP-1252-aware browser.
const cp1252TailRanges = [
  '\\u0080-\\u00BF', // Raw Latin-1 supplement: NBSP, ¡, ¢, £, ©, ®, °, ±, etc.
  '\\u0152\\u0153', // Œ œ
  '\\u0160\\u0161', // Š š
  '\\u017D\\u017E', // Ž ž
  '\\u0178', // Ÿ
  '\\u0192', // ƒ
  '\\u02C6\\u02DC', // ˆ ˜
  '\\u2013\\u2014', // en/em dash
  '\\u2018-\\u201E', // Smart quotes
  '\\u2020-\\u2022', // † ‡ •
  '\\u2026', // …
  '\\u2030', // ‰
  '\\u2039\\u203A', // ‹ ›
  '\\u20AC', // €
  '\\u2122', // ™
].join('')

// The mojibake byte-prefix classes, each followed by a CP-1252 tail char.
const mojibakePrefixes = [
  '\\u00E2\\u20AC', // `â€`: 3-byte UTF-8 starting 0xE2 0x80 (U+2000-U+207F general punctuation).
  '\\u00C3', // `Ã`: 2-byte UTF-8 starting 0xC3 (U+00C0-U+00FF Latin-1 supplement).
  '\\u00C2', // `Â`: 2-byte UTF-8 starting 0xC2 (U+0080-U+00BF early Latin-1).
]

const mojibakeMarkerRegex = new RegExp(
  mojibakePrefixes.map((prefix) => `${prefix}[${cp1252TailRanges}]`).join('|'),
)

// Subtrees where literal byte-pair text is content, not corruption, e.g. a
// blog post explaining `Ã©` as a byte sequence.
const opaqueTags = new Set(['code', 'pre', 'kbd', 'samp', 'tt', 'script', 'style'])

// Double-encoded mojibake (`MÃƒÂ¼ller` → `MÃ¼ller` → `Müller`) needs two passes.
// Triple-encoded content (~12 of 2.7M corpus files) can't be fully unwound: the
// state after one peel re-encodes into invalid UTF-8, so the U+FFFD guard would
// revert a third pass anyway. The first pass still reduces the visible noise.
const maxPasses = 2

const utf8Decoder = new TextDecoder('utf-8', { fatal: false })

const reencodeAsBytes = (text: string): Uint8Array => {
  const bytes = new Uint8Array(text.length)

  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    bytes[index] = cp1252SpecialToByte.get(code) ?? code & 0xff
  }

  return bytes
}

const countReplacementChars = (text: string): number => {
  return text.split('�').length - 1
}

const fixText = (text: string): string => {
  let current = text

  for (let pass = 0; pass < maxPasses; pass++) {
    if (!mojibakeMarkerRegex.test(current)) {
      return current
    }

    const fixed = utf8Decoder.decode(reencodeAsBytes(current))

    // The reverse round-trip mangles text that wasn't mojibake (native
    // Portuguese, emoji): the re-encoded bytes don't form valid UTF-8 and
    // decode introduces U+FFFD. Revert rather than trade one corruption for
    // another.
    if (countReplacementChars(fixed) > countReplacementChars(current)) {
      return current
    }

    current = fixed
  }

  return current
}

export const fixMojibakeEncoding: DomTransform = () => {
  return (document) => {
    // linkedom splits text at each decoded entity boundary; merge adjacent
    // text nodes so multi-char mojibake sequences (`â€™`, `Ã©`, `Â©`) live in
    // a single node where the regex can match them.
    document.body.normalize()

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = node as Text
      const data = text.data

      if (!data) {
        continue
      }

      if (hasAncestorWithTagName(text, opaqueTags)) {
        continue
      }

      const fixed = fixText(data)

      if (fixed !== data) {
        text.data = fixed
      }
    }
  }
}
