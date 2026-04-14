import { unwrapOuterTag } from '../common.js'
import type { StringTransform } from '../types.js'

const wrapperRegex =
  /^<(div|article|section|main|header|footer)(\s[^>]*)?>[\s\n]*([\s\S]*)[\s\n]*<\/\1>$/i

export const unwrapWrappers: StringTransform = () => {
  return (html) => {
    return unwrapOuterTag(html, wrapperRegex)
  }
}
