import type { StringTransform } from '../../types.js'

// The gaps at Tab, LF and CR are deliberate.
const ranges = [
  '\\x00-\\x08', // C0 controls excl. Tab
  '\\x0B\\x0C', // VT, FF
  '\\x0E-\\x1F', // C0 controls excl. LF, CR
  '\\x7F-\\x9F', // DEL + C1 controls
  // Noncharacters, which Unicode reserves for internal use and XML 1.0 forbids.
  '\\uFDD0-\\uFDEF', // BMP noncharacter block
  '\\uFFFE\\uFFFF', // BMP noncharacters
  // Astral noncharacters: the last two code points of each of the 16 supplementary planes.
  ...Array.from({ length: 16 }, (_, index) => {
    const plane = (index + 1).toString(16).toUpperCase()
    return `\\u{${plane}FFFE}\\u{${plane}FFFF}`
  }),
]

const controlCharRegex = new RegExp(`[${ranges.join('')}]`, 'gu')

// Control characters and Unicode noncharacters, which truncate text nodes or open escapes.
export const stripControlChars: StringTransform = () => {
  return (html) => {
    return html.replace(controlCharRegex, '')
  }
}
