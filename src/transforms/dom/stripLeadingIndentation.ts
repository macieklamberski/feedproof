import type { DomTransform } from '../../types.js'
import { isBlockElement, isElement, isText } from '../../utils/dom.js'

// Some feeds fake indentation by prefixing block text with non-breaking spaces
// (e.g. `<p>&nbsp;&nbsp;&nbsp;Lorem…`). Ordinary leading whitespace collapses at
// the start of a block, so it renders no indent and is left alone. Non-collapsing
// spaces (nbsp and the other fixed-width Unicode spaces) do render as a hard left
// indent, so the leading run is stripped whenever it contains one.
const targetSelector = [
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'dd',
].join(', ')

const leadingWhitespaceRegex = /^\s+/

// HTML's collapsible whitespace set; any other `\s` char (U+00A0, U+2000–200A,
// U+202F, U+205F, U+3000, …) is fixed-width and renders as indentation.
const nonCollapsingWhitespaceRegex = /[^ \t\n\f\r]/

export const stripLeadingIndentation: DomTransform = () => {
  return (document) => {
    for (const block of document.querySelectorAll(targetSelector)) {
      // Descend the leftmost path to the first text node, stepping through inline
      // wrappers but stopping at nested blocks, which their own match handles.
      let node = block.firstChild

      while (isElement(node) && !isBlockElement(node) && node.firstChild) {
        node = node.firstChild
      }

      // Consecutive entities (`&nbsp;&nbsp;`) parse to adjacent text nodes, so the
      // leading run can span several. Walk them, accumulating the combined leading
      // whitespace, until a node carries real content or the siblings end.
      let combinedLeading = ''
      const whitespaceNodes = []
      let boundaryNode = null
      let boundaryLength = 0

      while (isText(node)) {
        const leading = node.data.match(leadingWhitespaceRegex)?.[0] ?? ''
        combinedLeading += leading

        if (leading.length === node.data.length) {
          whitespaceNodes.push(node)
          node = node.nextSibling
        } else {
          boundaryNode = node
          boundaryLength = leading.length
          break
        }
      }

      if (!nonCollapsingWhitespaceRegex.test(combinedLeading)) {
        continue
      }

      for (const whitespaceNode of whitespaceNodes) {
        whitespaceNode.remove()
      }

      if (boundaryNode) {
        boundaryNode.data = boundaryNode.data.slice(boundaryLength)
      }
    }
  }
}
