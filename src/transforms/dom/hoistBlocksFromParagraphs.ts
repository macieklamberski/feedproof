import type { DomTransform } from '../../types.js'
import { blockElements, hasText, mediaElements } from '../../utils/dom.js'

const blockInParagraphSelector = [...blockElements].map((tag) => `p ${tag}`).join(', ')
const mediaSelector = [...mediaElements].join(', ')

// A paragraph half left with neither text nor media renders as a blank line. One that
// kept either stays.
const hasRenderableContent = (element: Element): boolean => {
  return hasText(element) || element.querySelector(mediaSelector) !== null
}

// Moves a block-level element out of the paragraph enclosing it. A block cannot live
// inside a <p>: a browser reparses `<p>x<div></div>y</p>` into a split paragraph, a
// hoisted block, bare text where `y` was, and a stray empty paragraph. The split is done
// here instead, so the emitted markup already matches the tree a browser would build. The
// chain of inline ancestors up to the paragraph is cloned around the block, the block
// lands between the halves, and a half with nothing left to render is dropped.
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

// Runs last so it covers every block an earlier transform inserted, whatever the route: a
// placeholder replacing an inline iframe, a <pre> promoted around a loose <code>, a
// wrapper built around a table. Those transforms move elements through the DOM API, which
// enforces no nesting rules, so a block can end up inside a <p> that only a browser would
// later take apart.
export const hoistBlocksFromParagraphs: DomTransform = () => {
  return (document) => {
    // Document order puts an outer block before the inner ones it holds, so hoisting it
    // carries them along and their own turn finds no enclosing paragraph left.
    for (const block of document.querySelectorAll(blockInParagraphSelector)) {
      hoistBlockFromParagraph(block)
    }
  }
}
