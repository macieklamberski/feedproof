import type { StringTransform } from '../../types.js'

// XML 1.0 allows tab (U+0009), LF (U+000A), CR (U+000D), and characters >= U+0020.
// Invalid: U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F-U+009F.
// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping XML 1.0-invalid control chars by spec
const xmlInvalidCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g

export const stripXmlInvalidChars: StringTransform = () => {
  return (html) => {
    return html.replace(xmlInvalidCharRegex, '')
  }
}
