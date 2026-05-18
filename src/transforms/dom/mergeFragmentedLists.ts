import { isComment, isWhitespaceText, Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Some feeds emit each list item as its own one-item <ul>/<ol> instead of one
// list with N items, breaking screen-reader semantics and visual spacing. This
// merges runs of consecutive sibling lists that share the same tag and the
// same attribute set into the first list of the run.
export const mergeFragmentedLists: DomTransform = () => {
  return (document) => {
    const lists = document.querySelectorAll('ul, ol')

    for (const list of lists) {
      // Skip if a previous iteration already absorbed this list.
      if (!list.parentNode) {
        continue
      }

      // Refuse to merge if the list is malformed — contains direct text or
      // non-<li> children. Merging would fuse adjacent text without a
      // separator and visibly change the rendered output.
      if (!hasOnlyListItemChildren(list)) {
        continue
      }

      // Collect a run of mergeable sibling lists, treating only whitespace text
      // and HTML comments as skippable separators.
      const run: Array<Element> = [list]
      let sibling = list.nextSibling

      while (sibling) {
        if (isWhitespaceText(sibling) || isComment(sibling)) {
          sibling = sibling.nextSibling
          continue
        }

        if (sibling.nodeType !== Node.ELEMENT_NODE) {
          break
        }

        const candidate = sibling as Element

        if (candidate.tagName !== list.tagName) {
          break
        }

        if (!attributesEqual(list, candidate)) {
          break
        }

        if (!hasOnlyListItemChildren(candidate)) {
          break
        }

        run.push(candidate)
        sibling = candidate.nextSibling
      }

      if (run.length < 2) {
        continue
      }

      // Move children of every later list into the first, dropping any
      // whitespace or comment nodes that were sitting between fragments.
      const target = run[0]

      for (const extra of run.slice(1)) {
        let between = target.nextSibling

        while (between && between !== extra) {
          const next = between.nextSibling

          if (isWhitespaceText(between) || isComment(between)) {
            between.parentNode?.removeChild(between)
          }

          between = next
        }

        while (extra.firstChild) {
          target.appendChild(extra.firstChild)
        }

        extra.remove()
      }
    }
  }
}

const hasOnlyListItemChildren = (list: Element): boolean => {
  for (let child = list.firstChild; child; child = child.nextSibling) {
    if (isWhitespaceText(child) || isComment(child)) {
      continue
    }

    const isElement = child.nodeType === Node.ELEMENT_NODE
    const isLi = isElement && (child as Element).tagName.toLowerCase() === 'li'

    if (!isLi) {
      return false
    }
  }
  return true
}

const attributesEqual = (a: Element, b: Element): boolean => {
  if (a.attributes.length !== b.attributes.length) {
    return false
  }

  for (const attribute of a.attributes) {
    if (b.getAttribute(attribute.name) !== attribute.value) {
      return false
    }
  }

  return true
}
