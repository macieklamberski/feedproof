import type { DomTransform } from '../../types.js'
import { blockElements, hasText, mediaElements } from '../../utils/dom.js'

const blockInParagraphSelector = [...blockElements].map((tag) => `p ${tag}`).join(', ')
const mediaSelector = [...mediaElements].join(', ')

// A paragraph half left with neither text nor media renders as a blank line. One that
// kept either stays.
const hasRenderableContent = (element: Element): boolean => {
  return hasText(element) || element.querySelector(mediaSelector) !== null
}

const hoistBlockFromParagraph = (block: Element): void => {
  const paragraph = block.parentElement?.closest('p')

  if (!paragraph) {
    return
  }

  let child: Node = block
  let trailing: Element | null = null

  while (child !== paragraph) {
    const parent = child.parentNode as Element
    const clone = parent.cloneNode(false) as Element

    while (child.nextSibling) {
      clone.appendChild(child.nextSibling)
    }

    // An empty clone is a husk: an inline wrapper whose only content was the block. It is
    // not carried into the trailing half.
    if (trailing && trailing.childNodes.length > 0) {
      clone.insertBefore(trailing, clone.firstChild)
    }

    trailing = clone
    child = parent
  }

  // Detach the block along with inline ancestors it leaves empty, so the leading half
  // does not keep husks like the `<em>` that only existed to wrap it.
  let removable: Element | null = block

  while (removable && removable !== paragraph) {
    const parent: Element | null = removable.parentElement
    removable.remove()

    if (!parent || parent === paragraph || hasRenderableContent(parent)) {
      break
    }

    removable = parent
  }

  paragraph.after(block)

  if (trailing && hasRenderableContent(trailing)) {
    block.after(trailing)
  }

  if (!hasRenderableContent(paragraph)) {
    paragraph.remove()
  }
}

// A block inside a <p>: a browser reparses it into a split paragraph plus a stray empty one.
export const hoistBlocksFromParagraphs: DomTransform = () => {
  return (document) => {
    // Document order puts an outer block before the inner ones it holds, so hoisting it
    // carries them along and their own turn finds no enclosing paragraph left.
    for (const block of document.querySelectorAll(blockInParagraphSelector)) {
      hoistBlockFromParagraph(block)
    }
  }
}
