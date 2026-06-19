import htmlTags from 'html-tags'
import { hasAncestorWithTagName, isText, NodeFilter } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Standard HTML elements (from html-tags) we materialize from escaped text. `pre`/`code` are
// excluded so an escaped code sample stays visible as text rather than becoming live elements
// a consumer's sanitizer can't un-render.
// TODO: ideally an encoded `<pre>`/`<code>` would decode into a real code block while keeping
// its contents escaped (rendering the sample as code), but that needs an escape-level-aware
// partial decode; for now such a fragment is left entirely as text.
const decodableTags = new Set<string>(htmlTags.filter((tag) => tag !== 'pre' && tag !== 'code'))

// Real elements whose entity-escaped contents are intentional text (a tutorial showing
// `<img>`), so their descendants are left untouched.
const opaqueTags = new Set(['code', 'pre', 'script', 'style', 'textarea', 'noscript'])

const tagNameRegex = /<\/?([a-zA-Z][\w-]*)/g
const openTagRegex = /<[a-zA-Z]/g

// True when the text node is itself an escaped HTML fragment: bounded by tags (a markup
// block, not prose that merely mentions a tag), with real structure (a closing tag or 2+
// opening tags, never a lone `<video>`/`<img>`), built only from decodable HTML elements
// (so `<dependency>`, `<dupa>`, and code blocks are left as text).
const isEscapedHtmlFragment = (data: string): boolean => {
  const trimmed = data.trim()

  if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) {
    return false
  }

  if (!trimmed.includes('</') && (trimmed.match(openTagRegex)?.length ?? 0) < 2) {
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
      node.replaceWith(...tempDiv.childNodes)
    }
  }
}
