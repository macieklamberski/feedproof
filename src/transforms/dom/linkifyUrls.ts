import { find as linkifyFind } from 'linkifyjs'
import { Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

const urlProtocolRegex = /^https?:\/\//i
const linkifyIgnoreTags = new Set(['a', 'pre', 'code', 'kbd', 'samp', 'var', 'script', 'style'])

const collectTextNodes = (node: Node, result: Array<Node> = []): Array<Node> => {
  if (
    node.nodeType === Node.ELEMENT_NODE &&
    linkifyIgnoreTags.has((node as Element).tagName.toLowerCase())
  ) {
    return result
  }

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      result.push(child)
    } else if (
      child.nodeType === Node.ELEMENT_NODE &&
      !linkifyIgnoreTags.has((child as Element).tagName.toLowerCase())
    ) {
      collectTextNodes(child, result)
    }
  }

  return result
}

// Walks text nodes in the already-parsed DOM and wraps bare URLs in <a> tags.
// Uses linkifyjs for URL detection instead of linkify-html, avoiding a redundant
// HTML re-parse (~25% pipeline speedup). Skips text inside tags like <a>, <pre>,
// <code> etc. via collectTextNodes.
export const linkifyUrls: DomTransform = () => {
  return (document) => {
    // Walk from document (not documentElement) so linkedom fragment siblings are
    // reachable. documentElement only points to the first root-level element.
    const textNodes = collectTextNodes(document) as Array<ChildNode>

    for (const node of textNodes) {
      const text = node.textContent

      // Fast pre-check: skip nodes without "://".
      if (!text?.trim() || !text?.includes('://')) {
        continue
      }

      // Detect bare URLs, keeping only http(s) protocol links.
      const links = linkifyFind(text).filter(
        (link) => link.type === 'url' && urlProtocolRegex.test(link.value),
      )

      if (links.length === 0) {
        continue
      }

      // Split the text node into alternating text + anchor parts.
      // E.g. "Visit https://a.com for info" becomes ["Visit ", <a>, " for info"].
      const parts: Array<Node> = []
      let lastIndex = 0

      for (const link of links) {
        if (link.start > lastIndex) {
          parts.push(document.createTextNode(text.slice(lastIndex, link.start)))
        }

        const anchor = document.createElement('a')
        anchor.setAttribute('href', link.href)
        anchor.textContent = link.value
        parts.push(anchor)
        lastIndex = link.end
      }

      if (lastIndex < text.length) {
        parts.push(document.createTextNode(text.slice(lastIndex)))
      }

      // Replace the original text node with the split parts.
      node.replaceWith(...parts)
    }
  }
}
