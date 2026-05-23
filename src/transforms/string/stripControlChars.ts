import type { StringTransform } from '../../types.js'

// Control characters that cause rendering hazards downstream: NUL truncates DOM
// text nodes and many string handlers, BEL (\x07) makes terminals beep, ESC
// (\x1B) opens terminal escape sequences, DEL (\x7F) and the C1 range
// (\x80-\x9F) interact badly with editors and clipboard handlers.
// Tab, LF, and CR are intentionally preserved as legitimate whitespace.
// biome-ignore lint/suspicious/noControlCharactersInRegex: The whole point is matching control chars.
const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g

export const stripControlChars: StringTransform = () => {
  return (html) => {
    return html.replace(controlCharRegex, '')
  }
}
