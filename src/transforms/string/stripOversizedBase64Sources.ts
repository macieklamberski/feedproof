import type { StringTransform } from '../../types.js'

const base64SrcRegex = /((?:src|srcset|poster)=["'])data:[^"']*;base64,[^"']*(["'])/g

// Base64 images can be megabytes of text that bloat DOM-tree memory.
// Strip oversized ones before parsing: keep the attribute, drop the payload.
const maxBase64Size = 50 * 1024

export const stripOversizedBase64Sources: StringTransform = () => {
  return (html) => {
    return html.replace(base64SrcRegex, (match, prefix, suffix) => {
      if (match.length < maxBase64Size) {
        return match
      }

      return `${prefix}${suffix}`
    })
  }
}
