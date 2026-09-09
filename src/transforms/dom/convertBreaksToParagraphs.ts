import type { DomTransform } from '../../types.js'
import {
  hasAncestorWithTagName,
  hasText,
  isBlockElement,
  isBr,
  isElement,
  isText,
  isWhitespaceText,
} from '../../utils/dom.js'

// No figure, unlike wrapBareInlineInParagraphs: a <br> run inside one needs no paragraph.
const processContainersSelector =
  'body, div, blockquote, td, li, article, section, main, header, footer, aside'

const preOrCodeTags = new Set(['pre', 'code'])

type Chunk = {
  start: number
  end: number
  hasContent: boolean
  hasBlock: boolean
}

// Prose split into paragraphs by runs of two or more <br>, which no stylesheet spaces as such.
export const convertBreaksToParagraphs: DomTransform = () => {
  return (document) => {
    for (const container of document.querySelectorAll(processContainersSelector)) {
      // Fast skip: containers with no direct <br> child can never produce a paragraph split.
      let hasBr = false

      for (let node = container.firstChild; node; node = node.nextSibling) {
        if (isBr(node)) {
          hasBr = true
          break
        }
      }

      if (!hasBr) {
        continue
      }

      if (hasAncestorWithTagName(container, preOrCodeTags)) {
        continue
      }

      const children: Array<Node> = []

      for (let node = container.firstChild; node; node = node.nextSibling) {
        children.push(node)
      }

      const childCount = children.length
      const chunks: Array<Chunk> = []
      let current: Chunk = { start: 0, end: 0, hasContent: false, hasBlock: false }
      let i = 0

      while (i < childCount) {
        const child = children[i]

        if (isBr(child)) {
          // Look ahead through consecutive <br>s and whitespace-only text.
          let brCount = 1
          let j = i + 1

          while (j < childCount) {
            const next = children[j]

            if (isBr(next)) {
              brCount++
            } else if (!isWhitespaceText(next)) {
              break
            }

            j++
          }

          if (brCount >= 2) {
            current.end = i
            chunks.push(current)
            current = { start: j, end: j, hasContent: false, hasBlock: false }
            i = j
          } else {
            // Single <br>: stays inside the current chunk as a real node.
            current.hasContent = true
            i++
          }
        } else {
          if (isElement(child)) {
            current.hasContent = true

            if (isBlockElement(child)) {
              current.hasBlock = true
            }
          } else if (isText(child)) {
            if (!current.hasContent && hasText(child)) {
              current.hasContent = true
            }
          }

          i++
        }
      }

      current.end = childCount
      chunks.push(current)

      if (chunks.length < 2) {
        continue
      }

      const newChildren: Array<Node> = []

      for (const chunk of chunks) {
        if (!chunk.hasContent) {
          continue
        }

        if (chunk.hasBlock) {
          for (let k = chunk.start; k < chunk.end; k++) {
            newChildren.push(children[k])
          }
        } else {
          const paragraph = document.createElement('p')

          for (let k = chunk.start; k < chunk.end; k++) {
            paragraph.appendChild(children[k])
          }

          newChildren.push(paragraph)
        }
      }

      container.replaceChildren(...newChildren)
    }
  }
}
