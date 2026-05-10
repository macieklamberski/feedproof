import { isBlockElement, Node } from '../common.js'
import type { DomTransform } from '../types.js'

const processContainers = [
  'body',
  'div',
  'blockquote',
  'td',
  'li',
  'article',
  'section',
  'main',
  'header',
  'footer',
  'aside',
]

const isBr = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'br'

const isWhitespaceText = (node: Node): boolean =>
  node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()

const hasContent = (chunk: ReadonlyArray<Node>): boolean =>
  chunk.some(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
  )

const isInsidePreOrCode = (element: Element): boolean => {
  let current = element.parentElement

  while (current) {
    const tag = current.tagName.toLowerCase()

    if (tag === 'pre' || tag === 'code') {
      return true
    }

    current = current.parentElement
  }

  return false
}

export const convertBreaksToParagraphs: DomTransform = () => {
  return (document) => {
    for (const container of document.querySelectorAll(processContainers.join(','))) {
      if (isInsidePreOrCode(container)) {
        continue
      }

      const children = [...container.childNodes]
      const chunks: Array<Array<Node>> = [[]]

      let i = 0

      while (i < children.length) {
        const child = children[i]

        if (isBr(child)) {
          let brCount = 1
          let j = i + 1

          while (j < children.length) {
            const next = children[j]

            if (isBr(next)) {
              brCount++
              j++
            } else if (isWhitespaceText(next)) {
              j++
            } else {
              break
            }
          }

          if (brCount >= 2) {
            chunks.push([])
            i = j
          } else {
            chunks[chunks.length - 1].push(child)
            i++
          }
        } else {
          chunks[chunks.length - 1].push(child)
          i++
        }
      }

      if (chunks.length < 2) {
        continue
      }

      const newChildren: Array<Node> = []

      for (const chunk of chunks) {
        if (!hasContent(chunk)) {
          continue
        }

        const containsBlock = chunk.some(isBlockElement)

        if (containsBlock) {
          newChildren.push(...chunk)
        } else {
          const paragraph = document.createElement('p')

          for (const node of chunk) {
            paragraph.appendChild(node)
          }

          newChildren.push(paragraph)
        }
      }

      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }

      for (const node of newChildren) {
        container.appendChild(node)
      }
    }
  }
}
