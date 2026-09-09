import { htmlTagNames } from 'html-tag-names'
import { mathmlTagNames } from 'mathml-tag-names'
import { svgTagNames } from 'svg-tag-names'

// Known HTML, SVG, and MathML elements we materialize from escaped text. Non-element names
// (`<dependency>`, `<groupId>`, `<T>`, `<host>`) are absent, so config/XML fragments, code
// generics, and command placeholders are left as text. SVG names are mixed-case in the spec
// (`clipPath`), so the set is lowercased to match the lowercased parsed names.
const decodableTags = new Set(
  [...htmlTagNames, ...svgTagNames, ...mathmlTagNames].map((tag) => tag.toLowerCase()),
)

const tagNameRegex = /<\/?([a-zA-Z][\w-]*)/g
const openTagRegex = /<[a-zA-Z]/g
// Custom element names must start with a lowercase letter and contain a hyphen, and built-in
// element names never contain one, so a hyphenated name is an element without enumeration.
const customElementNameRegex = /^[a-z][a-z0-9._]*-[a-z0-9._-]*$/

const isDecodableTagName = (name: string): boolean => {
  return decodableTags.has(name) || customElementNameRegex.test(name)
}

// True when the text is itself an escaped HTML fragment: bounded by tags (a markup
// block, not prose that merely mentions a tag), with real structure (an opening tag plus a
// close, or 2+ opening tags, never a lone `<video>` nor a stray `</code>`, which would
// decode to nothing), built only from known elements and custom element names (so
// `<dependency>`, `<groupId>`, and other non-HTML markup are left as text).
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
