import type { StringTransform } from '../types.js'

const emptyTagRegex = /<([a-z][a-z0-9]*)(\s[^>]*)?>(\s*)<\/\1>/gi
const preserveWhenEmpty = new Set(['iframe', 'video', 'audio', 'img', 'source'])

// Removes empty tag pairs like <div></div>, looping until stable so nested empties
// (<section><div><p></p></div></section>) collapse fully. Preserves media tags whose
// emptiness is meaningful, and replaces whitespace-only tags with a single space so
// inline word boundaries survive.
export const stripEmptyTags: StringTransform = () => {
  return (html) => {
    let previous = ''
    let result = html

    while (result !== previous) {
      previous = result
      result = result.replace(
        emptyTagRegex,
        (match, tagName: string, _attrs: string, content: string) => {
          if (preserveWhenEmpty.has(tagName.toLowerCase())) {
            return match
          }

          return content.length > 0 ? ' ' : ''
        },
      )
    }

    return result
  }
}
