import htmlTags from 'html-tags'

// Standard HTML elements (from html-tags) we materialize from escaped text. Non-HTML names
// (`<dependency>`, `<groupId>`) are absent, so config/XML fragments are left as text.
const decodableTags = new Set<string>(htmlTags)

const tagNameRegex = /<\/?([a-zA-Z][\w-]*)/g
const openTagRegex = /<[a-zA-Z]/g

// True when the text is itself an escaped HTML fragment: bounded by tags (a markup
// block, not prose that merely mentions a tag), with real structure (an opening tag plus a
// close, or 2+ opening tags, never a lone `<video>` nor a stray `</code>`, which would
// decode to nothing), built only from known HTML elements (so `<dependency>`, `<groupId>`, and
// other non-HTML markup are left as text).
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
    if (!decodableTags.has(match[1].toLowerCase())) {
      return false
    }
  }

  return true
}
