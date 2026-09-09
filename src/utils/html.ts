import { htmlTagNames } from 'html-tag-names'
import { mathmlTagNames } from 'mathml-tag-names'
import { svgTagNames } from 'svg-tag-names'

// Escaped text also carries `<dependency>`, `<groupId>`, `<T>` and `<host>`, which stay text.
// SVG names are mixed-case in the spec (`clipPath`), while parsed names arrive lowercased.
const decodableTags = new Set(
  [...htmlTagNames, ...svgTagNames, ...mathmlTagNames].map((tag) => tag.toLowerCase()),
)

const tagNameRegex = /<\/?([a-zA-Z][\w-]*)/g
const openTagRegex = /<[a-zA-Z]/g
// See: https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name.
// A custom element name carries a hyphen and a built-in name never does.
const customElementNameRegex = /^[a-z][a-z0-9._]*-[a-z0-9._-]*$/

const isDecodableTagName = (name: string): boolean => {
  return decodableTags.has(name) || customElementNameRegex.test(name)
}

// A lone `<video>` or a stray `</code>` decodes to nothing, so one tag without a close is text.
export const isEscapedHtmlFragment = (data: string): boolean => {
  const trimmed = data.trim()

  if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) {
    return false
  }

  const openCount = trimmed.match(openTagRegex)?.length ?? 0

  if (openCount === 0 || (!trimmed.includes('</') && openCount < 2)) {
    return false
  }

  for (const match of trimmed.matchAll(tagNameRegex)) {
    if (!isDecodableTagName(match[1].toLowerCase())) {
      return false
    }
  }

  return true
}
