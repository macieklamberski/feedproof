import type { StringTransform } from '../../types.js'

// Control characters that cause rendering hazards downstream: NUL truncates DOM
// text nodes and many string handlers, BEL (\x07) makes terminals beep, ESC
// (\x1B) opens terminal escape sequences, DEL (\x7F) and the C1 range
// (\x80-\x9F) interact badly with editors and clipboard handlers.
// Tab, LF, and CR are intentionally preserved as legitimate whitespace.
// Unicode noncharacters (U+FDD0-U+FDEF, U+FFFE/FFFF, and the terminal pair of
// each of the 16 supplementary planes) are also stripped — they are reserved
// by Unicode for internal use and invalid in XML 1.0. The `u` flag is required
// so astral noncharacters match as single code points instead of two UTF-16
// code units, which would leave a lone surrogate behind.
const ranges = [
  '\\x00-\\x08', // C0 controls excl. Tab.
  '\\x0B\\x0C', // VT, FF.
  '\\x0E-\\x1F', // C0 controls excl. LF, CR.
  '\\x7F-\\x9F', // DEL + C1 controls.
  '\\uFDD0-\\uFDEF', // BMP noncharacter block.
  '\\uFFFE\\uFFFF', // BMP noncharacters.
  // Astral noncharacters — last two code points of each of the 16 supplementary planes.
  ...Array.from({ length: 16 }, (_, index) => {
    const plane = (index + 1).toString(16).toUpperCase()
    return `\\u{${plane}FFFE}\\u{${plane}FFFF}`
  }),
]

const controlCharRegex = new RegExp(`[${ranges.join('')}]`, 'gu')

export const stripControlChars: StringTransform = () => {
  return (html) => {
    return html.replace(controlCharRegex, '')
  }
}
