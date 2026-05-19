import { Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Elements whose body content is literal text (tutorial markup, JS source,
// CSS, raw form input). Entity-decoded angle brackets inside these must stay
// as text — they're not encoded HTML waiting to be rendered.
const opaqueTags = new Set(['code', 'pre', 'script', 'style', 'textarea', 'noscript'])

// Heuristic guards on the serialized source. Decoding only kicks in when the
// document mixes real HTML with entity-encoded HTML — pure-encoded input is
// probably documentation about HTML tags, not a feed-generator bug.
const hasRealHtmlRegex = /<[a-z][a-z0-9]*[\s>]/i
const hasEncodedTagRegex = /&lt;[a-zA-Z/]/

// After the HTML parser decodes `&lt;` and `&gt;` in body text, those become
// literal `<` and `>` characters in text nodes. Plain HTML text data never
// contains `<` (the parser intercepts it as a tag start), so a `<…>` pattern
// in a text node only exists because of entity references in the source.
const tagInTextRegex = /<\/?[a-zA-Z][\w-]*[^<>]*>/

// Decodes HTML tags that were double-encoded by buggy feed generators. Walks
// the DOM, looks for `<…>` shapes in text nodes (which can only originate
// from entity-encoded source), re-parses the text via a throwaway container,
// and replaces the text node with the parsed elements.
//
// Skips attribute values (not text nodes) and raw-text element bodies
// (explicit `opaqueTags` set) without any regex masking — the DOM gives us
// those boundaries for free.
export const decodeDoubleEncodedTags: DomTransform = () => {
  return (document) => {
    const source = document.body.innerHTML

    if (!hasRealHtmlRegex.test(source) || !hasEncodedTagRegex.test(source)) {
      return
    }

    // linkedom splits text at each decoded `<`/`>`, leaving an entity-encoded
    // tag spread across several adjacent text nodes. Merge them first so each
    // tag pattern lives in a single node we can re-parse atomically.
    document.body.normalize()
    visit(document, document.body)
  }
}

const visit = (document: Document, parent: Element): void => {
  if (opaqueTags.has(parent.tagName.toLowerCase())) {
    return
  }

  for (const child of [...parent.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      visit(document, child as Element)
      continue
    }

    if (child.nodeType !== Node.TEXT_NODE) {
      continue
    }

    const data = (child as Text).data

    if (!tagInTextRegex.test(data)) {
      continue
    }

    const tmp = document.createElement('div')
    tmp.innerHTML = data
    child.replaceWith(...[...tmp.childNodes])
  }
}
