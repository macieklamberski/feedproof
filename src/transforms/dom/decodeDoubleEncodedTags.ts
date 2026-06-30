import htmlTags from 'html-tags'
import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName, isText, NodeFilter } from '../../utils/dom.js'

// Standard HTML elements (from html-tags) we materialize from escaped text. Non-HTML names
// (`<dependency>`, `<dupa>`) are absent, so config/XML fragments are left as text.
const decodableTags = new Set<string>(htmlTags)

// Real elements whose entity-escaped contents are intentional text (a tutorial showing
// `<img>`), so their descendants are left untouched.
const opaqueTags = new Set(['code', 'pre', 'script', 'style', 'textarea', 'noscript'])

const tagNameRegex = /<\/?([a-zA-Z][\w-]*)/g
const openTagRegex = /<[a-zA-Z]/g

// True when the text node is itself an escaped HTML fragment: bounded by tags (a markup
// block, not prose that merely mentions a tag), with real structure (an opening tag plus a
// close, or 2+ opening tags — never a lone `<video>` nor a stray `</code>`, which would
// decode to nothing), built only from known HTML elements (so `<dependency>`, `<dupa>`, and
// other non-HTML markup are left as text).
const isEscapedHtmlFragment = (data: string): boolean => {
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

// Decodes HTML that a buggy feed generator entity-escaped so it shipped as visible text.
// Only a whole escaped fragment is decoded; an escaped tag embedded in prose, a lone tag,
// or non-HTML markup is left as text, since those are ambiguous and likely intentional.
export const decodeDoubleEncodedTags: DomTransform = () => {
  return (document) => {
    document.body.normalize()

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let tempDiv: HTMLDivElement | null = null

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (!isText(node) || !node.data.includes('<')) {
        continue
      }

      if (hasAncestorWithTagName(node, opaqueTags)) {
        continue
      }

      if (!isEscapedHtmlFragment(node.data)) {
        continue
      }

      if (tempDiv === null) {
        tempDiv = document.createElement('div')
      }

      tempDiv.innerHTML = node.data

      // An escaped `<pre>`/`<code>` is a code sample: decode the wrapper into a real code block,
      // but re-escape its contents so the sample's tags show as text rather than render as markup.
      for (const element of tempDiv.querySelectorAll('code')) {
        element.textContent = element.innerHTML
      }

      for (const element of tempDiv.querySelectorAll('pre')) {
        if (!element.querySelector('code')) {
          element.textContent = element.innerHTML
        }
      }

      node.replaceWith(...tempDiv.childNodes)
    }
  }
}
