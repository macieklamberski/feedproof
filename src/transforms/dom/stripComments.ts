import { Node, parseFragment } from '../../common.js'
import type { DomTransform } from '../../types.js'

const codeBlockTags = new Set(['pre', 'code'])

// CDATA-shaped comment captured in one node: `[CDATA[ ... ]]` (with optional
// whitespace). Feeds sometimes wrap entire articles in `<!--[CDATA[ ... ]]-->`,
// which HTML5 parses as a single bogus comment. Removing it would erase the
// article — unwrap its content instead.
const cdataCommentPattern = /^\s*\[CDATA\[([\s\S]*?)\]\]\s*$/

// Split-CDATA detection: the wrapper's article body contained an internal
// `-->` (Mermaid arrows, Word's `<!--StartFragment-->`, CSS comments, …), so
// the HTML5 parser terminated the comment at that first `-->` and left the
// rest of the wrapper as following siblings. The first node's data starts
// with `[CDATA[` but doesn't end with `]]`.
const cdataStartPattern = /^\s*\[CDATA\[/
const cdataEndPattern = /\]\]\s*-->/
const cdataOuterStartPattern = /^<!--\s*\[CDATA\[/
const cdataOuterEndPattern = /\]\]\s*-->[\s\S]*$/

// Removes HTML comments from feed content. Comments are typically authoring
// noise (editor scaffolding, tracking markers, conditional-comment leftovers)
// that adds no value to the rendered output and can interfere with downstream
// DOM traversal. Preserves comments inside <pre> and <code> blocks because
// those usually contain tutorial markup where the comment is part of the
// example. Unwraps CDATA-shaped comments rather than dropping them, since
// their content is real article HTML that just happened to be wrapped in a
// CDATA pseudo-marker that HTML5 misparses as a comment.
export const stripComments: DomTransform = () => {
  return (document) => {
    const visit = (node: Node, inCodeBlock: boolean) => {
      // Snapshot children before iterating because removal mutates the live list.
      const children = Array.from(node.childNodes)

      for (const child of children) {
        // Skip nodes already detached by a sibling unwrap.
        if (!child.parentNode) {
          continue
        }

        if (child.nodeType === Node.COMMENT_NODE) {
          if (inCodeBlock) {
            continue
          }

          const data = (child as Comment).data ?? ''
          const cdataMatch = cdataCommentPattern.exec(data)

          if (cdataMatch) {
            unwrapInner(child, cdataMatch[1])
            child.remove()
            continue
          }

          // Split CDATA: a `[CDATA[` opener with no closing `]]` means the
          // wrapper's article content contained an internal `-->` that
          // closed the outer comment prematurely. Walk forward through
          // siblings to reconstruct the original wrapper source.
          if (cdataStartPattern.test(data)) {
            const consumed: Array<Node> = []
            let raw = `<!--${data}-->`
            let cursor: Node | null = child.nextSibling
            while (cursor && !cdataEndPattern.test(raw)) {
              consumed.push(cursor)
              raw += serializeNode(cursor)
              cursor = cursor.nextSibling
            }

            if (cdataEndPattern.test(raw)) {
              const inner = raw
                .replace(cdataOuterStartPattern, '')
                .replace(cdataOuterEndPattern, '')
              unwrapInner(child, inner)
              for (const c of consumed) {
                c.parentNode?.removeChild(c)
              }
            }
          }

          child.remove()
          continue
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as Element
          visit(element, inCodeBlock || codeBlockTags.has(element.tagName.toLowerCase()))
        }
      }
    }

    visit(document.body, false)
  }
}

const serializeNode = (node: Node): string => {
  if (node.nodeType === Node.COMMENT_NODE) {
    return `<!--${(node as Comment).data ?? ''}-->`
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return (node as Element).outerHTML
  }
  return ''
}

const unwrapInner = (anchor: Node, inner: string): void => {
  const parent = anchor.parentNode
  if (!parent) {
    return
  }
  const innerDoc = parseFragment(inner)
  const innerNodes = Array.from(innerDoc.body.childNodes)
  for (const innerChild of innerNodes) {
    parent.insertBefore(innerChild, anchor)
  }
}
